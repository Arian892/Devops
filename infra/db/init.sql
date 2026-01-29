CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS inventory_service;
CREATE SCHEMA IF NOT EXISTS order_service;

CREATE TABLE IF NOT EXISTS inventory_service.inventory (
    product_id TEXT PRIMARY KEY,
    quantity INT NOT NULL CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS inventory_service.processed_transactions (
    request_id TEXT PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_service.orders (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sample data for testing
INSERT INTO inventory_service.inventory (product_id, quantity) VALUES
    ('laptop-pro', 15),
    ('wireless-mouse', 50),
    ('mechanical-keyboard', 8),
    ('monitor-4k', 12),
    ('usb-c-hub', 25),
    ('webcam-hd', 0)
ON CONFLICT (product_id) DO NOTHING;
