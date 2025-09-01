import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { ProductIcon, SearchIcon } from '../components/Icons';
import { useNavigate } from 'react-router-dom';
import { useProductsList, useProductDetails, useProductSentiment } from '../hooks/useProductQueries';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import { useAuth } from '../contexts/AuthContext';

const Product = ({ selectedProduct: selectedProductProp }) => {
  // Get authentication context
  const { isAuthenticated, user } = useAuth();

  // Get shared product selection context
  const {
    selectedCategory,
    selectedProduct,
    setSelectedCategory,
    setSelectedProduct,
    setProducts,
    categories,
    getSelectedProductTitle,
  } = useProductSelection();

  // Use the prop if provided, otherwise fall back to context
  const currentSelectedProduct = selectedProductProp || selectedProduct;

  // Navigation hook
  const navigate = useNavigate();

  // TanStack Query hooks for server state management
  const { 
    data: productsData, 
    isLoading: loadingProducts, 
    error: productsError 
  } = useProductsList(selectedCategory);

  const { 
    data: productDetailsData, 
    isLoading: loadingProductDetails, 
    error: productDetailsError 
  } = useProductDetails(currentSelectedProduct);

  // Real sentiment data query
  const { 
    data: realSentimentData, 
    isLoading: loadingSentiment, 
    error: sentimentError 
  } = useProductSentiment(currentSelectedProduct);

  // Local state for UI
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [actualReviewCount, setActualReviewCount] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);

  // Update products in context when query data changes
  useEffect(() => {
    if (productsData?.products) {
      setProducts(productsData.products);
    }
  }, [productsData, setProducts]);

  // Clear error when data successfully loads
  useEffect(() => {
    if (productsData || productDetailsData) {
      setError('');
    }
  }, [productsData, productDetailsData]);

  // Handle query errors
  useEffect(() => {
    if (productsError) {
      console.error('Products error:', productsError);
      if (productsError.message?.includes('Authentication failed')) {
        setError('Please log in to access product data. Go to the login page to continue.');
      } else {
        setError('Failed to load products. Please try again.');
      }
    } else if (productDetailsError) {
      console.error('Product details error:', productDetailsError);
      if (productDetailsError.message?.includes('Authentication failed')) {
        setError('Please log in to access product details. Go to the login page to continue.');
      } else {
        setError('Failed to load product details. Please try again.');
      }
    } else if (sentimentError) {
      console.error('Sentiment error:', sentimentError);
      if (sentimentError.message?.includes('Authentication failed')) {
        setError('Please log in to access sentiment data. Go to the login page to continue.');
      } else {
        setError('Failed to load sentiment data. Please try again.');
      }
    }
  }, [productsError, productDetailsError, sentimentError]);

  // Extract values for rendering
  const products = productsData?.products || [];
  const productDetails = productDetailsData?.product || null;
  const loadingCategories = false; // Categories are now loaded by DashboardLayout

  // Update actual review count when product details change
  useEffect(() => {
    if (productDetailsData?.review_count !== undefined) {
      setActualReviewCount(productDetailsData.review_count);
    }
  }, [productDetailsData]);



  const nextImage = () => {
    if (productDetails?.images) {
      const validImages = productDetails.images.filter(imageObj => 
        imageObj && typeof imageObj === 'object' ? imageObj.large : imageObj
      );
      if (validImages.length > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
      }
    }
  };

  const prevImage = () => {
    if (productDetails?.images) {
      const validImages = productDetails.images.filter(imageObj => 
        imageObj && typeof imageObj === 'object' ? imageObj.large : imageObj
      );
      if (validImages.length > 0) {
        setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
      }
    }
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    console.log('Category changing from', selectedCategory, 'to', newCategory);
    setSelectedCategory(newCategory);
    // Clear product selection when category changes
    if (newCategory !== selectedCategory) {
      setSelectedProduct('');
    }
  };

  const handleProductChange = (e) => {
    const selectedParentAsin = e.target.value;
    console.log('Product changing from', selectedProduct, 'to', selectedParentAsin);
    setSelectedProduct(selectedParentAsin || '');
  };

  // Utility function for other features to get current selection
  const getCurrentSelection = () => {
    const selectedProductData = selectedProduct ? products.find(p => p.parent_asin === selectedProduct) : null;
    return {
      category: selectedCategory,
      product: {
        parent_asin: selectedProduct,
        title: selectedProductData?.title,
        fullData: selectedProductData
      },
      hasProducts: products.length > 0,
      isComplete: !!(selectedCategory && selectedProduct),
      canSelectProduct: !!(selectedCategory && products.length > 0)
    };
  };

  // Helper function to safely render any value
  const renderValue = (value, fieldName = '') => {
    if (value === null || value === undefined) {
      return "This information is not available";
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        // Special handling for images array
        if (fieldName === 'images') {
          const imageUrls = value.map(imageObj => 
            imageObj && typeof imageObj === 'object' ? imageObj.large : imageObj
          ).filter(url => url);
          return imageUrls.length > 0 ? `${imageUrls.length} image(s) available` : "No images available";
        }
        return value.join(', ');
      } else {
        // For objects, render as key-value pairs
        return Object.entries(value).map(([key, val]) => `${key}: ${val}`).join(', ');
      }
    }
    return String(value);
  };

  // Helper function to render price values
  const renderPrice = (value) => {
    console.log('Rendering price value:', value, 'Type:', typeof value);
    
    // Handle null, undefined, or "not available" messages
    if (value === null || value === undefined || value === "This information is not available") {
      return "Price not available";
    }
    
    // Handle already formatted strings with currency symbols
    if (typeof value === 'string' && (value.includes('$') || value.includes('USD'))) {
      return value;
    }
    
    // Handle numeric values (both number and string representations)
    if (typeof value === 'number' && !isNaN(value)) {
      return `$${value.toFixed(2)}`;
    }
    
    if (typeof value === 'string') {
      // Try to parse as float
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return `$${parsed.toFixed(2)}`;
      }
      
      // Handle strings like "9.99 USD" or "USD 9.99"
      const numMatch = value.match(/[\d.,]+/);
      if (numMatch) {
        const num = parseFloat(numMatch[0].replace(',', ''));
        if (!isNaN(num)) {
          return `$${num.toFixed(2)}`;
        }
      }
    }
    
    // Handle objects that might contain price data
    if (typeof value === 'object' && value !== null) {
      // Check for common price object properties
      const priceProps = ['amount', 'value', 'price', 'cost'];
      for (const prop of priceProps) {
        if (value[prop] !== undefined && value[prop] !== null) {
          const propValue = parseFloat(value[prop]);
          if (!isNaN(propValue)) {
            return `$${propValue.toFixed(2)}`;
          }
        }
      }
    }
    
    // Fallback: return as string
    return String(value);
  };

  // Helper function to render rating values
  const renderRating = (value) => {
    if (value === null || value === undefined) {
      return "Rating not available";
    }
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value).toFixed(1);
    }
    return String(value);
  };

  // Helper function for hash calculation (needed for hexagon seed fallback)
  const hash = (str) => {
    if (!str) return 0;
    return str.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
  };

  // Update sentiment data when real sentiment data becomes available
  useEffect(() => {
    if (realSentimentData) {
      console.log('Raw sentiment data from dedicated API:', realSentimentData);
      
      // Transform API data to match the expected format for the UI
      const positive = realSentimentData.summary_distribution?.positive || 0;
      const neutral = realSentimentData.summary_distribution?.neutral || 0;
      const negative = realSentimentData.summary_distribution?.negative || 0;
      const totalReviews = realSentimentData.total_reviews || 0;
      
      // Use actual counts from the new API if available, otherwise calculate from percentages
      const positiveReviews = realSentimentData.sentiment_counts?.positive || Math.round((totalReviews * positive) / 100);
      const neutralReviews = realSentimentData.sentiment_counts?.neutral || Math.round((totalReviews * neutral) / 100);
      const negativeReviews = realSentimentData.sentiment_counts?.negative || Math.round((totalReviews * negative) / 100);
      
      const transformedData = {
        positivePercentage: positive,
        neutralPercentage: neutral,
        negativePercentage: negative,
        totalReviews: totalReviews,
        positiveReviews: positiveReviews,
        neutralReviews: neutralReviews,
        negativeReviews: negativeReviews,
        rating: realSentimentData.average_rating?.toFixed(1) || '0.0',
        topWords: realSentimentData.top_words?.map(wordData => wordData.word) || [],
        hexagonSeed: realSentimentData.hexagon_seed || Math.abs(hash(realSentimentData.parent_asin || '')) % 10000
      };
      setSentimentData(transformedData);
      console.log('Transformed sentiment data for UI:', transformedData);
    }
  }, [realSentimentData]);

  // Helper function to render details as bullet points
  const renderDetailsAsBullets = (value) => {
    if (value === null || value === undefined) {
      return <p className="text-gray-500 italic">This information is not available</p>;
    }

    let items = [];

    if (Array.isArray(value)) {
      items = value.filter(item => item && String(item).trim() !== '');
    } else if (typeof value === 'object') {
      // Convert object to key-value bullet points
      items = Object.entries(value)
        .filter(([key, val]) => val !== null && val !== undefined && String(val).trim() !== '')
        .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`);
    } else if (typeof value === 'string') {
      // Try to split string into bullet points by common delimiters
      const delimiters = ['\n', '•', '·', '-', '*', '|', ';'];
      let splitItems = [value];
      
      for (const delimiter of delimiters) {
        if (value.includes(delimiter)) {
          splitItems = value.split(delimiter)
            .map(item => item.trim())
            .filter(item => item && item !== '');
          break;
        }
      }
      
      items = splitItems;
    } else {
      items = [String(value)];
    }

    if (items.length === 0) {
      return <p className="text-gray-500 italic">No details available</p>;
    }

    if (items.length === 1) {
      return <p className="text-sm text-black">{items[0]}</p>;
    }

    // Limit to first 20 items to prevent layout issues
    const displayItems = items.slice(0, 20);

    return (
      <ul className="text-sm text-black space-y-1">
        {displayItems.map((item, index) => (
          <li key={index} className="flex items-start">
            <span className="text-gray-400 mr-2 mt-0.5">•</span>
            <span className="flex-1">{String(item).trim()}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6 fade-in">


      {/* Header Section */}
      <div className="mb-8">
        <div style={styles.titleContainer}>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={styles.title}>
            Product Selection
          </h1>
          <div style={styles.tooltipContainer}>
            <button
              onMouseEnter={(e) => {
                setShowTooltip(true);
                e.target.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                setShowTooltip(false);
                e.target.style.backgroundColor = '#3b82f6';
              }}
              onClick={() => setShowTooltip(!showTooltip)}
              style={styles.tooltipButton}
              aria-label="Information about Product Selection"
            >
              <svg style={styles.tooltipIcon} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div style={styles.tooltip}>
                <div style={styles.tooltipContent}>
                  <h3 style={styles.tooltipTitle}>About Product Selection</h3>
                  <p style={styles.tooltipText}>
                    This is the central hub for product analysis. Select a product here to unlock all visualization features across the platform. Also within this page there are the following features:
                  </p>
                  <ul style={styles.tooltipList}>
                    <li><strong>Product Information:</strong> View detailed product data, images, pricing, and ratings</li>
                    <li><strong>Sentiment Summary:</strong> Get instant sentiment analysis with pie charts, hexagon visualization, and top review words</li>
                  </ul>
                  <p style={styles.tooltipText}>
                    <strong>Important:</strong> You must select a product on this page before using other visualization tabs. Your selection will be remembered across all pages.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div style={styles.tooltipArrow}></div>
              </div>
            )}
          </div>
        </div>
        <p className="text-black-600 text-lg leading-relaxed">
          Select a product to proceed with sentiment summary and visualization in other pages.
        </p>
      </div>

      {/* Authentication Status */}
      {!isAuthenticated() && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <strong>Authentication Required:</strong> Please <button 
                onClick={() => navigate('/login')} 
                className="text-yellow-900 underline hover:text-yellow-700"
              >
                log in
              </button> to access product sentiment data.
            </div>
          </div>
        </div>
      )}

      {error && ( 
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter Section */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-bold">
              Select a category:
              {loadingCategories && (
                <span className="ml-2">
                  <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
                </span>
              )}
            </label>
            <select 
              value={selectedCategory} 
              onChange={handleCategoryChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                (loadingCategories && !selectedCategory) 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 text-black cursor-pointer'
              } ${
                selectedCategory 
                  ? 'border-primary-500 font-semibold' 
                  : 'border-gray-300'
              }`}
              disabled={loadingCategories && !selectedCategory}
            >
              <option value="">
                {loadingCategories && !selectedCategory 
                  ? 'Loading categories...' 
                  : 'Select a category'}
              </option>
              {/* Show selected category even if categories are still loading */}
              {selectedCategory && !categories.includes(selectedCategory) && (
                <option key={selectedCategory} value={selectedCategory}>
                  {selectedCategory}
                </option>
              )}
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Product Dropdown */}
          <div>
            <label className="block text-sm font-medium text-black-700 mb-2 font-bold">
              Select a product:
              {loadingProducts && (
                <span className="ml-2">
                  <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
                </span>
              )}
            </label>
            <select 
              value={selectedProduct} 
              onChange={handleProductChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                (!selectedCategory || (loadingProducts && !selectedProduct) || (selectedCategory && !loadingProducts && products.length === 0 && !selectedProduct)) 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 text-black cursor-pointer'
              } ${
                selectedProduct 
                  ? 'border-primary-500 font-semibold' 
                  : 'border-gray-300'
              }`}
              disabled={!selectedCategory || (loadingProducts && !selectedProduct) || (selectedCategory && !loadingProducts && products.length === 0 && !selectedProduct)}
            >
              <option value="">
                {!selectedCategory 
                  ? 'Select a category first' 
                  : loadingProducts && !selectedProduct
                  ? 'Loading products...' 
                  : products.length === 0 && !selectedProduct
                  ? 'No products available - select another category'
                  : 'Select a product'}
              </option>
              {/* Show selected product even if products are still loading */}
              {selectedProduct && !products.find(p => p.parent_asin === selectedProduct) && (
                <option key={selectedProduct} value={selectedProduct}>
                  {getSelectedProductTitle() || selectedProduct} ({selectedProduct})
                </option>
              )}
              {products.map(product => (
                <option 
                  key={product.parent_asin} 
                  value={product.parent_asin}
                >
                  {product.title} ({product.parent_asin})
                </option>
              ))}
            </select>
            
            {/* Show warning message for categories with no products */}
            {selectedCategory && !loadingProducts && products.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
                This category has no products available. Please select a different category.
              </div>
            )}
          </div>
        </div>
        
        {/* Display selection info */}
        {/* {selectedCategory && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Selected Category:</strong> {selectedCategory}
              {selectedProduct && (
                <>
                  <br />
                  <strong>Selected Product:</strong> {products.find(p => p.parent_asin === selectedProduct)?.title || selectedProduct}
                  <br />
                  <strong>Product Parent ASIN:</strong> {selectedProduct}
                </>
              )}
              {!selectedProduct && selectedCategory && (
                <>
                  <br />
                  <em className="text-blue-700">No product selected yet</em>
                </>
              )}
            </p>
          </div>
        )} */}
      </Card>

      {/* Product Information Section */}
      {selectedProduct && (
        <div className="space-y-6">
          {loadingProductDetails ? (
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-black">Loading product details...</p>
                </div>
              </div>
            </Card>
          ) : productDetails ? (
            <>
              {/* Sentiment Analysis Section */}
              <Card title={`Sentiment Summary`} subtitle="Analysis based on customer reviews and ratings">
                {/* Sentiment Metrics */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  {sentimentData && !loadingSentiment ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{sentimentData.positiveReviews}</div>
                        <div className="text-sm text-black">Positive Reviews</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">{sentimentData.neutralReviews || 0}</div>
                        <div className="text-sm text-black">Neutral Reviews</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">{sentimentData.negativeReviews}</div>
                        <div className="text-sm text-black">Negative Reviews</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-black">{sentimentData.totalReviews}</div>
                        <div className="text-sm text-black">Total Reviews</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{sentimentData.rating}</div>
                        <div className="text-sm text-black">Avg Rating</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-black">Loading sentiment analysis...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sentiment Pie Chart */}
                  <div className="bg-gray-200 rounded-lg p-6 text-center">
                    {sentimentData && !loadingSentiment ? (
                      <>
                        <div className="relative w-60 h-60 mx-auto mb-4">
                          {/* Three-segment CSS-based pie chart */}
                          <div className="w-full h-full rounded-full bg-gray-300 relative overflow-hidden">
                            <div 
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `conic-gradient(
                                  #10b981 0% ${sentimentData.positivePercentage || 0}%, 
                                  #6b7280 ${sentimentData.positivePercentage || 0}% ${(sentimentData.positivePercentage || 0) + (sentimentData.neutralPercentage || 0)}%, 
                                  #ef4444 ${(sentimentData.positivePercentage || 0) + (sentimentData.neutralPercentage || 0)}% 100%
                                )`
                              }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-gray-200 rounded-full w-36 h-36 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">{(sentimentData.positivePercentage || 0).toFixed(1)}%</div>
                                  <div className="text-xs text-black">Positive</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Legend */}
                        <div className="flex justify-center space-x-4 text-xs">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                            <span>Positive ({(sentimentData.positivePercentage || 0).toFixed(1)}%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
                            <span>Neutral ({(sentimentData.neutralPercentage || 0).toFixed(1)}%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                            <span>Negative ({(sentimentData.negativePercentage || 0).toFixed(1)}%)</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-60">
                        <div className="text-center">
                          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                          <p className="text-black">Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sentiment Hexagon */}
                  <div className="bg-gray-200 rounded-lg p-6">
                    {sentimentData && !loadingSentiment ? (
                      <>
                        <div className="flex justify-center">
                          <svg width="360" height="240" viewBox="0 0 360 240">
                            {/* Generate 1000 hexagons using d3.js honeycomb pattern principles */}
                            {(() => {
                              const hexagons = [];
                              const hexRadius = 6.5; // Larger radius for better visibility
                              const mapColumns = 32; // Adjusted columns for larger hexagons
                              const mapRows = 28;    // Adjusted rows for larger hexagons
                              
                              // Use product-specific seed for consistent but different patterns
                              const seed = sentimentData.hexagonSeed;
                              let randomIndex = 0;
                              const seededRandom = () => {
                                const x = Math.sin(seed + randomIndex++) * 10000;
                                return x - Math.floor(x);
                              };
                              
                              // Calculate hexagon centers using Visual Cinnamon's method
                              let hexIndex = 0;
                              for (let i = 0; i < mapRows && hexIndex < 1000; i++) {
                                for (let j = 0; j < mapColumns && hexIndex < 1000; j++) {
                                  // Calculate x position: hexRadius * j * Math.sqrt(3)
                                  let x = hexRadius * j * Math.sqrt(3);
                                  
                                  // Offset every other row by half hexagon width
                                  if (i % 2 === 1) {
                                    x += (hexRadius * Math.sqrt(3)) / 2;
                                  }
                                  
                                  // Calculate y position: hexRadius * i * 1.5
                                  const y = hexRadius * i * 1.5;
                                  
                                  // Skip if outside bounds
                                  if (x > 350 || y > 230) continue;
                                  
                                  // Create sentiment based on dynamic three-tier percentage
                                  const sentimentType = seededRandom() * 100;
                                  let fillColor;
                                  const positiveThreshold = sentimentData.positivePercentage || 0;
                                  const neutralThreshold = positiveThreshold + (sentimentData.neutralPercentage || 0);
                                  
                                  if (sentimentType < positiveThreshold) { // Positive
                                    fillColor = sentimentType < positiveThreshold * 0.7 ? '#10b981' : '#6ee7b7'; // Dark green : Light green
                                  } else if (sentimentType < neutralThreshold) { // Neutral
                                    fillColor = sentimentType < positiveThreshold + ((sentimentData.neutralPercentage || 0) * 0.6) ? '#6b7280' : '#9ca3af'; // Dark grey : Light grey
                                  } else { // Negative
                                    fillColor = sentimentType < neutralThreshold + ((sentimentData.negativePercentage || 0) * 0.5) ? '#ef4444' : '#dc2626'; // Light red : Dark red
                                  }
                                  
                                  // Create hexagon path using d3 hexagon formula
                                  const hexPath = `M${x},${y - hexRadius}L${x + hexRadius * Math.cos(Math.PI/6)},${y - hexRadius/2}L${x + hexRadius * Math.cos(Math.PI/6)},${y + hexRadius/2}L${x},${y + hexRadius}L${x - hexRadius * Math.cos(Math.PI/6)},${y + hexRadius/2}L${x - hexRadius * Math.cos(Math.PI/6)},${y - hexRadius/2}Z`;
                                  
                                  hexagons.push(
                                    <path
                                      key={hexIndex}
                                      d={hexPath}
                                      fill={fillColor}
                                      stroke="white"
                                      strokeWidth="1"
                                      style={{ filter: 'drop-shadow(0 0.5px 1px rgba(0, 0, 0, 0.1))' }}
                                    />
                                  );
                                  
                                  hexIndex++;
                                }
                              }
                              
                              return hexagons;
                            })()}
                          </svg>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 text-center">
                          The heatmap represents the sentiment of the latest 1000 reviews<br/>
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-60">
                        <div className="text-center">
                          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                          <p className="text-black">Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top Sentiment Words */}
                  <div className="bg-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-black mb-4">
                      Top words used in the reviews
                    </h4>
                    {sentimentData && !loadingSentiment ? (
                      <ol className="space-y-1 text-sm">
                        {sentimentData.topWords.map((word, index) => (
                          <li key={word} className="flex items-center text-gray-700">
                            <span className="w-6 text-gray-500">{index + 1}.</span>
                            <span className="text-black">{word}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                          <p className="text-black">Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Product Header */}
              <Card title={productDetails.title} subtitle={`Product ID: ${selectedProduct}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Image Slider */}
                  <div>
                    {(() => {
                      const validImages = productDetails.images && Array.isArray(productDetails.images) 
                        ? productDetails.images.filter(imageObj => 
                            imageObj && typeof imageObj === 'object' ? imageObj.large : imageObj
                          ).map(imageObj => 
                            imageObj && typeof imageObj === 'object' ? imageObj.large : imageObj
                          )
                        : [];

                      return validImages.length > 0 ? (
                        <div className="space-y-4">
                          {/* Main Image Display */}
                          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
                            <img
                              src={validImages[currentImageIndex]}
                              alt={`Product image ${currentImageIndex + 1}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center">
                              <div className="text-center">
                                <div className="text-4xl text-gray-400 mb-2">📷</div>
                                <p className="text-gray-500">Image not available</p>
                              </div>
                            </div>
                            
                            {/* Navigation Arrows */}
                            {validImages.length > 1 && (
                              <>
                                <button
                                  onClick={prevImage}
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                                >
                                  &#8249;
                                </button>
                                <button
                                  onClick={nextImage}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                                >
                                  &#8250;
                                </button>
                              </>
                            )}
                          </div>

                          {/* Thumbnail Navigation */}
                          {validImages.length > 1 && (
                            <div className="flex space-x-2 overflow-x-auto">
                              {validImages.map((image, index) => (
                                <button
                                  key={index}
                                  onClick={() => goToImage(index)}
                                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                    index === currentImageIndex 
                                      ? 'border-primary-500' 
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <img
                                    src={image}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}

                          <p className="text-sm text-gray-500 text-center">
                            Image {currentImageIndex + 1} of {validImages.length}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-6xl text-gray-400 mb-4">📷</div>
                            <p className="text-gray-500">No images available</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Basic Product Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-4">Product Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-black">Price:&nbsp;</span>
                          <span className="text-sm text-black">{renderPrice(productDetails.price)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-black">Average Rating:&nbsp;</span>
                          <span className="text-sm text-black">{renderRating(productDetails.average_rating)} / 5.0</span>
                        </div>
                      </div>
                    </div>

                                         {/* Product Details */}
                     {(productDetails.details || productDetails.product_details) && (
                       <div>
                         <h4 className="font-medium text-black mb-2">Details</h4>
                         <div>
                           {renderDetailsAsBullets(productDetails.details || productDetails.product_details)}
                         </div>
                       </div>
                     )}

                    {/* Product Categories */}
                    {(productDetails.categories || productDetails.sub_categories || productDetails.category_tree) && (
                      <div>
                        <h4 className="font-medium text-black mb-2">Categories</h4>
                        <div className="text-sm text-black">
                          {renderValue(productDetails.categories || productDetails.sub_categories || productDetails.category_tree)}
                        </div>
                      </div>
                    )}
                  </div>
                                </div>
              </Card>

            </>
          ) : (
            <Card>
              <div className="text-center py-12">
                <div className="text-4xl text-gray-400 mb-4">⚠️</div>
                <p className="text-black">No product details available for this product.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#000000',
    margin: '0'
  },
  tooltipContainer: {
    position: 'relative'
  },
  tooltipButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    outline: 'none'
  },
  tooltipIcon: {
    width: '20px',
    height: '20px'
  },
  tooltip: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    width: '384px',
    backgroundColor: '#f3f4f6',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 50,
    padding: '24px'
  },
  tooltipContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5'
  },
  tooltipTitle: {
    fontWeight: '600',
    fontSize: '18px',
    color: '#111827',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  tooltipText: {
    fontSize: '16px',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  tooltipList: {
    listStyle: 'disc',
    paddingLeft: '20px',
    marginBottom: '12px',
    fontSize: '16px'
  },
  tooltipArrow: {
    position: 'absolute',
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '16px',
    height: '16px',
    backgroundColor: '#f3f4f6',
    border: '2px solid #d1d5db',
    borderRight: 'none',
    borderBottom: 'none',
    transform: 'translateX(-50%) rotate(45deg)'
  }
};

export default Product; 