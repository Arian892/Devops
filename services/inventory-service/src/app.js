import express from "express";
import { injectGremlin } from "./gremlin.js";
import pg from "pg";

const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

import amqp from 'amqplib';

async function consumeMessages() {
    const amqpUrl = 'amqp://admin:password@rabbitmq:5672';
    try {
        const connection = await amqp.connect(amqpUrl);
        
        connection.on("error", (err) => {
            console.error("RabbitMQ connection error. Retrying...");
            setTimeout(consumeMessages, 5000);
        });

        const channel = await connection.createChannel();
        await channel.assertQueue('inventory_updates', { durable: true });
        channel.prefetch(1);

        console.log("Inventory Service connected and waiting for messages...");

        channel.consume('inventory_updates', async (msg) => {
            if (msg !== null) {
                console.log("Received message:", msg.content.toString());
                const { productId, quantity, orderId } = JSON.parse(msg.content.toString());
                
                try {
                    await pool.query(
                        'UPDATE inventory_service.inventory SET quantity = quantity - $1 WHERE product_id = $2',
                        [quantity, productId]
                    );
                    console.log(`Inventory updated for Order: ${orderId}`);
                    const notification = { orderId, status: 'COMPLETED', message: 'Inventory confirmed' };
                    await channel.assertQueue('order_notifications', { durable: true });
                    channel.sendToQueue('order_notifications', Buffer.from(JSON.stringify(notification)));
                    channel.ack(msg); 
                } catch (err) {
                    console.error("Failed to process message:", err);
                    channel.nack(msg, false, true); 
                }
            }
        });
    } catch (err) {
        console.error("RabbitMQ Connection Failed (Inventory). Retrying in 5s...");
        setTimeout(consumeMessages, 5000);
    }
}

consumeMessages();



app.use(
  "/api/inventory-service/update-stock",
  injectGremlin({
    failureRate: 0,
    minDelay: 2000,
    maxDelay: 7000,
  }),
);

app.get('/api/inventory-service/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        return res.status(200).json({
            status: 'UP',
            service: 'inventory-service'
        });
    } catch (error) {
        return res.status(500).json({
            status: 'DOWN',
            service: 'inventory-service',
            reason: 'Database unreachable'
        });
    }
});

app.post(
  "/api/inventory-service/restock", 
  async (req, res) => {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Invalid product or quantity" });
    }

    try {
      const result = await pool.query(
        `INSERT INTO inventory_service.inventory (product_id, quantity)
         VALUES ($1, $2)
         ON CONFLICT (product_id) 
         DO UPDATE SET quantity = inventory.quantity + $2
         RETURNING *`,
        [productId, quantity]
      );

      res.status(200).json({ 
        message: "Stock updated successfully", 
        item: result.rows[0] 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error during restock" });
    }
  }
);

app.post("/api/inventory-service/update-stock", async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE inventory_service.inventory 
             SET quantity = quantity - $1 
             WHERE product_id = $2 AND quantity >= $1
             RETURNING *`,
      [quantity, productId],
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Insufficient stock" });
    }
    res.status(200).json({ status: "success", stock: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/inventory-service/products-with-stock", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS id, 
        p.name AS name, 
        p.price AS price, 
        i.quantity AS stock
      FROM 
        inventory_service.product p
      JOIN 
        inventory_service.inventory i ON p.id = i.product_id
      ORDER BY p.id ASC;
    `;
    
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Join Query Error:", err);
    res.status(500).json({ error: "Failed to fetch products with stock levels" });
  }
});


app.get("/api/inventory-service/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.price,
        COALESCE(i.quantity, 0) as quantity
      FROM inventory_service.product p
      LEFT JOIN inventory_service.inventory i ON p.id = i.product_id
      ORDER BY p.id
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/inventory-service/products", async (req, res) => {
  const { name, price, initialQuantity } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Missing required product fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      "INSERT INTO inventory_service.product (name, price) VALUES ($1, $2) RETURNING id, name, price",
      [name, price]
    );

    const newProductId = productResult.rows[0].id;

    await client.query(
      "INSERT INTO inventory_service.inventory (product_id, quantity) VALUES ($1, $2)",
      [newProductId, initialQuantity || 0]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Product created and inventory initialized",
      product: productResult.rows[0]
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Product Creation Error:", err);
    res.status(500).json({ error: "Database error while creating product" });
  } finally {
    client.release();
  }
});

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Inventory service running on internal port ${PORT}`),
);
