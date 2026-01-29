import express from 'express';
import pg from 'pg';
import amqp from 'amqplib';

const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const responseTimes = []; 

app.get('/api/order-service/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const inventoryUrl = `${process.env.INVENTORY_SERVICE_INTERNAL_URL}/api/inventory-service/health`;
    
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
    if (!channel) {
        return res.status(503).json({ error: "Messaging service not ready" });
    }
    try {
        const orderResult = await pool.query(
            'INSERT INTO order_service.orders (product_id, quantity, status) VALUES ($1, $2, $3) RETURNING id',
            [productId, quantity, 'PENDING']
        );

        const message = { productId, quantity, requestId, orderId: orderResult.rows[0].id };
        channel.sendToQueue('inventory_updates', Buffer.from(JSON.stringify(message)), {
            persistent: true 
        });

        res.status(202).json({ 
            message: "Order accepted and is being processed", 
            orderId: orderResult.rows[0].id 
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to queue order' });
    }
});

const PORT = 3002;
app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));