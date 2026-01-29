import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [orderMessages, setOrderMessages] = useState({});

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products. Please try again later.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId, change) => {
    setQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + change);
      const product = products.find(p => p.id === productId);
      return {
        ...prev,
        [productId]: Math.min(newQty, product.stock)
      };
    });
  };

  const handleOrder = async (product) => {
    const quantity = quantities[product.id] || 1;
    
    try {
      // Call the order API
      await apiService.placeOrder(product.id, quantity);
      
      // Show success message
      setOrderMessages(prev => ({
        ...prev,
        [product.id]: `Ordered ${quantity} x ${product.name} successfully!`
      }));

      // Refresh products to get updated stock
      fetchProducts();

      // Clear message after 3 seconds
      setTimeout(() => {
        setOrderMessages(prev => ({
          ...prev,
          [product.id]: ''
        }));
      }, 3000);

    } catch (err) {
      // Show error message
      setOrderMessages(prev => ({
        ...prev,
        [product.id]: `Failed to place order. Please try again.`
      }));

      // Clear error message after 3 seconds
      setTimeout(() => {
        setOrderMessages(prev => ({
          ...prev,
          [product.id]: ''
        }));
      }, 3000);

      console.error('Error placing order:', err);
    }
  };

  return (
    <div>
      <h1 className="page-title">Product Catalog</h1>
      
      {loading && (
        <div style={{textAlign: 'center', padding: '2rem'}}>
          <p>Loading products...</p>
        </div>
      )}

      {error && (
        <div className="error-message" style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
          <button 
            onClick={fetchProducts}
            style={{
              marginLeft: '1rem',
              background: 'transparent',
              border: '1px solid #721c24',
              color: '#721c24',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div style={{textAlign: 'center', padding: '2rem'}}>
          <p>No products available.</p>
        </div>
      )}
      
      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-name">{product.name}</div>
            <div className="product-price">${product.price}</div>
            <div className="product-stock">
              Stock: {product.stock} 
              {product.stock === 0 && <span style={{color: '#e74c3c'}}> (Out of Stock)</span>}
            </div>
            <p style={{color: '#7f8c8d', fontSize: '0.9rem', marginBottom: '1rem'}}>
              {product.description}
            </p>

            {product.stock > 0 && (
              <>
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn"
                    onClick={() => updateQuantity(product.id, -1)}
                  >
                    -
                  </button>
                  <div className="quantity-display">
                    {quantities[product.id] || 1}
                  </div>
                  <button 
                    className="quantity-btn"
                    onClick={() => updateQuantity(product.id, 1)}
                  >
                    +
                  </button>
                </div>

                <button 
                  className="order-btn"
                  onClick={() => handleOrder(product)}
                >
                  Order Now - ${((quantities[product.id] || 1) * product.price).toFixed(2)}
                </button>
              </>
            )}

            {product.stock === 0 && (
              <button className="order-btn" disabled>
                Out of Stock
              </button>
            )}

            {orderMessages[product.id] && (
              <div className={`message ${orderMessages[product.id].includes('Failed') ? 'error-message' : 'success-message'}`} 
                   style={{marginTop: '1rem'}}>
                {orderMessages[product.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;
