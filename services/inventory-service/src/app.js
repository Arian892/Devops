import express from "express";
import { injectGremlin } from "./gremlin.js";
import pg from "pg";

const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  "/api/inventory-service/update-stock",
  injectGremlin({
    failureRate: 0.9,
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


const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Inventory service running on internal port ${PORT}`),
);
