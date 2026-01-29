import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    description: ''
  });

  // Restock form state
  const [restockData, setRestockData] = useState({
    productId: '',
    quantity: ''
  });

  // Update stock form state (set new stock value)
  const [updateStockData, setUpdateStockData] = useState({
    productId: '',
    quantity: ''
  });

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

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRestockChange = (e) => {
    const { name, value } = e.target;
    setRestockData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateStockChange = (e) => {
    const { name, value } = e.target;
    setUpdateStockData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addNewProduct = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Note: You'll need to implement this endpoint in your backend
      // For now, we'll just refresh the product list
      // const result = await apiService.createProduct(newProduct);
      
      setNewProduct({ name: '', price: '', stock: '', description: '' });
      showSuccessMessage(`New product "${newProduct.name}" would be added (API endpoint needed)`);
      
      // Refresh products after adding
      fetchProducts();
      
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Failed to add product. Please try again.');
    }
  };

  const restockProduct = async (e) => {
    e.preventDefault();
    
    if (!restockData.productId || !restockData.quantity) {
      alert('Please select a product and enter quantity');
      return;
    }

    const productId = parseInt(restockData.productId);
    const additionalStock = parseInt(restockData.quantity);
    
    try {
      await apiService.restockProduct(productId, additionalStock);
      
      const productName = products.find(p => p.id === productId)?.name;
      setRestockData({ productId: '', quantity: '' });
      
      showSuccessMessage(`Added ${additionalStock} units to "${productName}" stock!`);
      
      // Refresh products after restocking
      fetchProducts();
      
    } catch (err) {
      console.error('Error restocking product:', err);
      alert('Failed to restock product. Please try again.');
    }
  };

  const updateStock = async (e) => {
    e.preventDefault();
    
    if (!updateStockData.productId || !updateStockData.quantity) {
      alert('Please select a product and enter new stock quantity');
      return;
    }

    const productId = parseInt(updateStockData.productId);
    const newStock = parseInt(updateStockData.quantity);
    
    try {
      await apiService.updateStock(productId, newStock);
      
      const productName = products.find(p => p.id === productId)?.name;
      setUpdateStockData({ productId: '', quantity: '' });
      
      showSuccessMessage(`Updated "${productName}" stock to ${newStock} units!`);
      
      // Refresh products after updating stock
      fetchProducts();
      
    } catch (err) {
      console.error('Error updating stock:', err);
      alert('Failed to update stock. Please try again.');
    }
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div>
      <h1 className="page-title">Admin Panel</h1>

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

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {/* Add New Product Section */}
      <div className="admin-section">
        <h2>Add New Product</h2>
        <form onSubmit={addNewProduct}>
          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newProduct.name}
              onChange={handleNewProductChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              name="price"
              step="0.01"
              min="0"
              value={newProduct.price}
              onChange={handleNewProductChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">Initial Stock *</label>
            <input
              type="number"
              id="stock"
              name="stock"
              min="0"
              value={newProduct.stock}
              onChange={handleNewProductChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              type="text"
              id="description"
              name="description"
              value={newProduct.description}
              onChange={handleNewProductChange}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Add Product
          </button>
        </form>
      </div>

      {/* Update Stock Section */}
      <div className="admin-section">
        <h2>Update Product Stock (Set New Value)</h2>
        <form onSubmit={updateStock}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="updateProductId">Select Product *</label>
              <select
                id="updateProductId"
                name="productId"
                value={updateStockData.productId}
                onChange={handleUpdateStockChange}
                required
              >
                <option value="">Choose a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Current stock: {product.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="updateQuantity">New Stock Value *</label>
              <input
                type="number"
                id="updateQuantity"
                name="quantity"
                min="0"
                value={updateStockData.quantity}
                onChange={handleUpdateStockChange}
                required
              />
            </div>

            <div className="form-group">
              <button type="submit" className="btn btn-primary">
                Update Stock
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* Restock Existing Product Section */}
      <div className="admin-section">
        <h2>Restock Existing Product (Add to Current Stock)</h2>
        <form onSubmit={restockProduct}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="productId">Select Product *</label>
              <select
                id="productId"
                name="productId"
                value={restockData.productId}
                onChange={handleRestockChange}
                required
              >
                <option value="">Choose a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Current stock: {product.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Add Quantity *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                min="1"
                value={restockData.quantity}
                onChange={handleRestockChange}
                required
              />
            </div>

            <div className="form-group">
              <button type="submit" className="btn btn-success">
                Restock
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Current Products Overview */}
      <div className="admin-section">
        <h2>Current Products</h2>
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-name">{product.name}</div>
              <div className="product-price">${product.price}</div>
              <div className="product-stock">
                Stock: {product.stock}
                {product.stock === 0 && <span style={{color: '#e74c3c'}}> (Out of Stock)</span>}
                {product.stock < 10 && product.stock > 0 && <span style={{color: '#f39c12'}}> (Low Stock)</span>}
              </div>
              <p style={{color: '#7f8c8d', fontSize: '0.9rem'}}>
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
