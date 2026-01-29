import amqp from 'amqplib';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function startWorker() {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    const queue = 'inventory_updates';

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1); // Process one message at a time for safety

    console.log("Inventory Worker is online and waiting for messages...");

    channel.consume(queue, async (msg) => {
        const { productId, quantity, requestId } = JSON.parse(msg.content.toString());
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const log = await client.query(
                "INSERT INTO inventory_service.processed_transactions (request_id) VALUES ($1) ON CONFLICT DO NOTHING",
                [requestId]
            );

            if (log.rowCount > 0) {
                const result = await client.query(
                    `UPDATE inventory_service.inventory SET quantity = quantity - $1 
                     WHERE product_id = $2 AND quantity >= $1 RETURNING *`,
                    [quantity, productId]
                );

                if (result.rowCount === 0) throw new Error("INSUFFICIENT_STOCK");
            }

            await client.query('COMMIT');
            console.log(`✅ Processed Request ${requestId}`);
            channel.ack(msg);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed Request ${requestId}: ${err.message}`);
            err.message === "INSUFFICIENT_STOCK" ? channel.ack(msg) : channel.nack(msg);
        } finally {
            client.release();
        }
    });
}

startWorker();