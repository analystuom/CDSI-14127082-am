import React from 'react';

const ComparisonDropdown = ({ 
  label, 
  selectedProductId, 
  onSelectionChange, 
  availableProducts = [], 
  isLoading = false,
  placeholder = "Select a product to compare"
}) => {
  
  const handleChange = (e) => {
    const selectedId = e.target.value;
    onSelectionChange(selectedId || null);
  };

  const getProductName = (productId) => {
    const product = availableProducts.find(p => p.parent_asin === productId);
    return product ? product.product_name : productId;
  };

  const getProductCategories = (productId) => {
    const product = availableProducts.find(p => p.parent_asin === productId);
    return product ? product.shared_categories || [] : [];
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {isLoading && (
          <span className="ml-2">
            <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          </span>
        )}
      </label>
      
      <select 
        value={selectedProductId || ''} 
        onChange={handleChange}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          isLoading && !selectedProductId
            ? 'bg-gray-200 text-black cursor-not-allowed' 
            : 'bg-gray-200 text-black cursor-pointer'
        } ${
          selectedProductId 
            ? 'border-blue-500 font-semibold' 
            : 'border-gray-300'
        }`}
        disabled={isLoading && !selectedProductId}
      >
        <option value="">
          {isLoading && !selectedProductId 
            ? 'Loading products...' 
            : placeholder}
        </option>
        
        {/* Show selected product even if products are still loading */}
        {selectedProductId && !availableProducts.find(p => p.parent_asin === selectedProductId) && (
          <option key={selectedProductId} value={selectedProductId}>
            {getProductName(selectedProductId)}
          </option>
        )}
        
        {availableProducts.map(product => (
          <option 
            key={product.parent_asin} 
            value={product.parent_asin}
            title={`Shared categories: ${product.shared_categories ? product.shared_categories.join(', ') : 'N/A'}`}
          >
            {product.product_name} ({product.parent_asin})
          </option>
        ))}
      </select>
      
      {/* Show message if no products available */}
      {!isLoading && availableProducts.length === 0 && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
          No comparable products found in the same category.
        </div>
      )}
      
      {/* Show selected product info with shared categories */}
      {selectedProductId && (
        <div className="mt-2 p-3 bg-gray-200 border border-gray-200 text-gray-800 rounded-lg shadow-sm">
          <div className="font-medium text-black">{getProductName(selectedProductId)}</div>
          <div className="text-xs text-black mt-1">
            ID: {selectedProductId}
          </div>
          {getProductCategories(selectedProductId).length > 0 && (
            <div className="text-xs text-black mt-1">
              <span className="font-medium">Shared categories:</span> {getProductCategories(selectedProductId).join(', ')}
            </div>
          )}
        </div>
      )}
      
      {/* Show total available products */}
      {!isLoading && availableProducts.length > 0 && (
        <div className="mt-2 text-xs text-black">
          {availableProducts.length} product{availableProducts.length !== 1 ? 's' : ''} available for comparison
        </div>
      )}
    </div>
  );
};

export default ComparisonDropdown; 