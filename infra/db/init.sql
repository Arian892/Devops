CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS inventory_service;
CREATE SCHEMA IF NOT EXISTS order_service;

-- Inventory Service Tables
CREATE TABLE IF NOT EXISTS inventory_service.product(
    id SERIAL PRIMARY KEY, -- This auto-increments (1, 2, 3...)
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_service.inventory (
    product_id INT PRIMARY KEY REFERENCES inventory_service.product(id), 
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
