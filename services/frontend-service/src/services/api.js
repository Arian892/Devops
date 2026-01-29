const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

// API service for all backend calls
export const apiService = {
  // Get all products
  async getProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory-service/getProducts`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return await response.json();
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
          productId,
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
          productId,
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
          productId,
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
