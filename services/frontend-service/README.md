# Frontend Service

A React-based frontend for the Product Management System.

## Features

### Product List Page (/)
- Display products with dummy data
- Each product shows name, price, stock, and description
- Quantity selector (+/- buttons)
- Order button with total price calculation
- Out of stock handling

### Admin Panel (/admin)
- Add new products with name, price, stock, and description
- Restock existing products (add quantity to current stock)
- View all current products with stock levels
- Visual indicators for out of stock and low stock items

## Development

The frontend runs on port 3000 and is configured to work with the backend API gateway on port 8081.

## Next Steps

- Replace dummy data with actual API calls to backend services
- Add authentication/authorization
- Implement order history
- Add product images
- Enhance UI/UX
