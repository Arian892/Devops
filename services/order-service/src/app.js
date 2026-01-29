import express from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { updateInventory } from './inventoryClient.js';    
import pg from 'pg';
import amqp from 'amqplib';

const app = express();
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const JWKS = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    const token = authHeader.split(' ')[1];
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
        });
        req.user = payload; 
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized: ' + e.message });
    }
};
let channel;

async function connectRabbitMQ() {
    try {
        // Use the environment variable from your docker-compose
        const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://admin:password@rabbitmq:5672');
        channel = await conn.createChannel();
        await channel.assertQueue('inventory_updates', { durable: true });
        console.log("🚀 Order Service connected to RabbitMQ");
    } catch (err) {
        console.error("❌ RabbitMQ Connection Failed:", err.message);
        setTimeout(connectRabbitMQ, 5000); // Retry logic
    }
}
connectRabbitMQ();
// app.post('/api/order-service/orders', authenticate, async (req, res) => {
//     const { productId, quantity } = req.body;
//     const userId = req.user.id; 

//     try {
//         const orderResult = await pool.query(
//             'INSERT INTO order_service.orders (product_id, quantity, status) VALUES ($1, $2, $3) RETURNING id',
//             [productId, quantity, 'PENDING']
//         );
//         const orderId = orderResult.rows[0].id;

//         const inventoryResponse = await updateInventory({ productId, quantity, orderId });

//         if (inventoryResponse.status === 'timeout') {
//             await pool.query('UPDATE order_service.orders SET status = $1 WHERE id = $2', ['RECONCILIATION_NEEDED', orderId]);
//             return res.status(504).json(inventoryResponse);
//         }

//         if (inventoryResponse.status === 'success' || inventoryResponse.status === 'success') {
//             await pool.query('UPDATE order_service.orders SET status = $1 WHERE id = $2', ['COMPLETED', orderId]);
//             return res.status(201).json({ orderId, status: 'COMPLETED' });
//         }

//         res.status(400).json({ error: 'Order failed', details: inventoryResponse });
//     } catch (err) {
//         console.error("Order Flow Crash:", err.message);
//         res.status(500).json({ error: 'Internal Server Error', message: err.message });
//     }
// });


// app.post('/api/order-service/orders', authenticate, async (req, res) => {
//     const { productId, quantity, requestId } = req.body;
//         console.log("requestid : " + requestId)

//     try {
//         const orderResult = await pool.query(
//             'INSERT INTO order_service.orders (product_id, quantity, status) VALUES ($1, $2, $3) RETURNING id',
//             [productId, quantity, 'PENDING']
//         );
//         const orderId = orderResult.rows[0].id;
//         const inventoryResponse = await updateInventory({ 
//             productId, 
//             quantity, 
//             requestId 
//         }, req.headers.authorization.split(' ')[1]);

//         if (inventoryResponse.status === 'timeout') {
//             await pool.query('UPDATE order_service.orders SET status = $1 WHERE id = $2', ['RECONCILIATION_NEEDED', orderId]);
//             return res.status(504).json(inventoryResponse);
//         }

//         if (inventoryResponse.status === 'success') {
//             await pool.query('UPDATE order_service.orders SET status = $1 WHERE id = $2', ['COMPLETED', orderId]);
//             return res.status(201).json({ orderId, status: 'COMPLETED' });
//         }

//         res.status(400).json({ error: 'Order failed', details: inventoryResponse });
//     } catch (err) {
//         console.error("Order Flow Crash:", err.message);
//         res.status(500).json({ error: 'Internal Server Error', message: err.message });
//     }
// });
// order-service/app.js (Inside the POST route)
app.post('/api/order-service/orders', authenticate, async (req, res) => {
    const { productId, quantity } = req.body;
    const requestId = req.body.requestId || uuid();
    if (!channel) {
        return res.status(503).json({ error: "Messaging service not ready" });
    }
    try {
        // 1. Save locally as PENDING
        const orderResult = await pool.query(
            'INSERT INTO order_service.orders (product_id, quantity, status) VALUES ($1, $2, $3) RETURNING id',
            [productId, quantity, 'PENDING']
        );

        // 2. Publish to RabbitMQ instead of calling HTTP
        const message = { productId, quantity, requestId, orderId: orderResult.rows[0].id };
        channel.sendToQueue('inventory_updates', Buffer.from(JSON.stringify(message)), {
            persistent: true // Message survives RabbitMQ restart
        });

        // 3. Respond immediately to client
        // No more 504 timeouts! The "latency" is now handled in the background.
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