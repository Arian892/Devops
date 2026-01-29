import express from 'express';
import pg from 'pg';
import amqp from 'amqplib';
import { v4 as uuid } from 'uuid'; // Missing Import
const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });


let channel; // Declare globally so it's accessible everywhere

async function connectRabbitMQ() {
    const amqpUrl = 'amqp://admin:password@rabbitmq:5672';
    try {
        const connection = await amqp.connect(amqpUrl);
        
        connection.on("close", () => {
            channel = null; 
            console.error("RabbitMQ connection closed. Retrying...");
            setTimeout(connectRabbitMQ, 5000);
        });

        channel = await connection.createChannel();
        await channel.assertQueue('inventory_updates', { durable: true });
        
        console.log("Order Service connected to RabbitMQ");
    } catch (err) {
        console.error("RabbitMQ Connection Failed. Retrying in 5s...");
        setTimeout(connectRabbitMQ, 5000); // Retry logic
    }
}

connectRabbitMQ();


const responseTimes = []; 

app.get('/api/order-service/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const inventoryUrl = `${process.env.INVENTORY_SERVICE_INTERNAL_URL}/api/inventory-service/health`;
    const requestId = req.body.requestId || uuid();
    const inventoryResponse = await fetch(inventoryUrl);

    if (!inventoryResponse.ok) {
      return res.status(503).json({
        status: 'DOWN',
        service: 'order-service',
        reason: 'Inventory service unavailable'
      });
    }

    const avgResponseTime =
      responseTimes.length === 0
        ? 0
        : responseTimes.reduce((sum, r) => sum + r.duration, 0) /
          responseTimes.length;

    if (avgResponseTime > 1000) {
      return res.status(503).json({
        status: 'DOWN',
        service: 'order-service',
        reason: 'High response time',
        avgResponseTime: `${avgResponseTime}ms`
      });
    }

    return res.status(200).json({
      status: 'UP',
      service: 'order-service',
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`
    });

  } catch (err) {
    return res.status(503).json({
      status: 'DOWN',
      service: 'order-service',
      reason: err.message || 'Dependency failure'
    });
  }
});

app.post('/api/order-service/orders', async (req, res) => {
    const { productId, quantity } = req.body;
    const requestId = req.body.requestId || uuid();

    try {
        const orderResult = await pool.query(
            'INSERT INTO order_service.orders (product_id, quantity, status) VALUES ($1, $2, $3) RETURNING id',
            [productId, quantity, 'PENDING']
        );
        const orderId = orderResult.rows[0].id;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
            const inventoryResponse = await fetch(`${process.env.INVENTORY_SERVICE_INTERNAL_URL}/api/inventory-service/update-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (inventoryResponse.ok) {
                await pool.query('UPDATE order_service.orders SET status = $1 WHERE id = $2', ['COMPLETED', orderId]);
                return res.status(200).json({ message: "Order processed immediately", orderId });
            }
            throw new Error("Inventory service returned an error");

        } catch (syncError) {
            console.log("Sync call failed/timed out. Falling back to Message Queue...");
            
            if (!channel) {
                return res.status(503).json({ error: "Inventory sync failed and Queue is not ready" });
            }

            const message = { productId, quantity, requestId, orderId };
            channel.sendToQueue('inventory_updates', Buffer.from(JSON.stringify(message)), { persistent: true });

            return res.status(202).json({ 
                message: "Inventory busy (Timeout). Order queued for background processing.", 
                orderId 
            });
        }

    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});


const PORT = 3002;
app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));