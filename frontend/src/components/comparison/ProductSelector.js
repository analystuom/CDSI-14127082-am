import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';

const ProductSelector = ({ selectedProducts, onSelectionChange, availableProducts = [] }) => {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Sample products for demonstration - in a real app these would come from an API
  const sampleProducts = [
    { id: 'B07DJHX9KV', name: 'Asda' },
    { id: 'B08N5WRWNW', name: 'Tesco' },
    { id: 'B07YTJ4QZW', name: 'Sainsburys' },
    { id: 'B07GDMRDTZ', name: 'Sample Product A' },
    { id: 'B08HJKL123', name: 'Sample Product B' },
    { id: 'B09MNO456', name: 'Sample Product C' },
  ];
  
  const products = availableProducts.length > 0 ? availableProducts : sampleProducts;
  
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedProducts.includes(product.id)
  );
  
  const addProduct = (productId) => {
    if (!selectedProducts.includes(productId) && selectedProducts.length < 5) {
      onSelectionChange([...selectedProducts, productId]);
      setInputValue('');
      setIsDropdownOpen(false);
    }
  };
  
  const removeProduct = (productId) => {
    onSelectionChange(selectedProducts.filter(id => id !== productId));
  };
  
  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : productId;
  };
  
  return (
    <Card title="Select Products for Comparison" subtitle="Choose up to 5 products to compare their sentiment">
      <div className="space-y-4">
        {/* Product Input */}
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search and select products..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={selectedProducts.length >= 5}
          />
          
          {/* Dropdown */}
          {isDropdownOpen && inputValue && filteredProducts.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-200 border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredProducts.slice(0, 10).map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-200 focus:bg-gray-200 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-black">{product.name}</div>
                  <div className="text-xs text-black">{product.id}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Products */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Selected Products ({selectedProducts.length}/5)
          </h4>
          
          {selectedProducts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedProducts.map((productId) => (
                <div
                  key={productId}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span className="mr-2">{getProductName(productId)}</span>
                  <button
                    onClick={() => removeProduct(productId)}
                    className="ml-1 hover:text-blue-600 focus:outline-none"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-black">No products selected. Search and select products above.</p>
          )}
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <strong>Instructions:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Search for products by name in the input field above</li>
              <li>Click on a product from the dropdown to add it to comparison</li>
              <li>You can select up to 5 products for comparison</li>
              <li>Remove products by clicking the × next to their name</li>
            </ul>
          </div>
        </div>
        
        {selectedProducts.length >= 5 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Maximum of 5 products reached. Remove a product to add another.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

// Click outside handler
const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export default ProductSelector; 