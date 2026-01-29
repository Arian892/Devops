const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

// Dummy product data to map with actual inventory
const PRODUCT_INFO = {
  'laptop-pro': { name: 'Laptop Pro', price: 999.99, description: 'High-performance laptop for professionals' },
  'wireless-mouse': { name: 'Wireless Mouse', price: 29.99, description: 'Ergonomic wireless mouse with precision tracking' },
  'mechanical-keyboard': { name: 'Mechanical Keyboard', price: 149.99, description: 'RGB mechanical keyboard with cherry switches' },
  'monitor-4k': { name: 'Monitor 4K', price: 299.99, description: '27-inch 4K display with HDR support' },
  'usb-c-hub': { name: 'USB-C Hub', price: 79.99, description: 'Multi-port USB-C hub with HDMI and ethernet' },
  'webcam-hd': { name: 'Webcam HD', price: 89.99, description: '1080p webcam with auto-focus' }
};

// API service for all backend calls
export const apiService = {
  // Get all products
  async getProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory-service/getProducts`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const inventoryData = await response.json();
      
      // Transform the data to include product info
      const products = inventoryData.map(item => ({
        id: item.product_id,
        product_id: item.product_id,
        name: PRODUCT_INFO[item.product_id]?.name || `Product ${item.product_id}`,
        price: PRODUCT_INFO[item.product_id]?.price || 0,
        description: PRODUCT_INFO[item.product_id]?.description || 'No description available',
        stock: item.quantity
      }));
      
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Place an order
  async placeOrder(productId, quantity) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/order-service/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId, // Changed to match your DB schema
          quantity
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to place order');
      }
      return await response.json();
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  },

  // Restock product (add to existing stock)
  async restockProduct(productId, quantity) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory-service/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId, // Changed to match your DB schema
          quantity
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to restock product');
      }
      return await response.json();
    } catch (error) {
      console.error('Error restocking product:', error);
      throw error;
    }
  },

  // Update stock (set new stock value)
  async updateStock(productId, quantity) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory-service/update-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId, // Changed to match your DB schema
          quantity
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update stock');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }
};
