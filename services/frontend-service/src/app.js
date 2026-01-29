import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// API Gateway URL (internal Docker network)
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://nginx:80';

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: 'frontend-service'
    });
});

// Proxy for inventory service APIs
app.use('/api/inventory-service', async (req, res) => {
    try {
        const url = `${API_GATEWAY_URL}${req.originalUrl}`;
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, options);
        const data = await response.json();
        
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal proxy error' });
    }
});

// Proxy for order service APIs
app.use('/api/order-service', async (req, res) => {
    try {
        const url = `${API_GATEWAY_URL}${req.originalUrl}`;
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, options);
        const data = await response.json();
        
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal proxy error' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frontend service running on port ${PORT}`);
});
