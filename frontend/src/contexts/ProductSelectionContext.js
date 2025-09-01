import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductSelectionContext = createContext();

export const useProductSelection = () => {
  const context = useContext(ProductSelectionContext);
  if (!context) {
    throw new Error('useProductSelection must be used within a ProductSelectionProvider');
  }
  return context;
};

export const ProductSelectionProvider = ({ children }) => {
  // State for product selection
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productDetails, setProductDetails] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // State for comparison product selections (persistent across navigation)
  const [comparisonProduct1, setComparisonProduct1] = useState('');
  const [comparisonProduct2, setComparisonProduct2] = useState('');

  // State for visualization data persistence
  const [wordCloudData, setWordCloudData] = useState({
    data: [],
    reviewsData: [],
    reviewTexts: [],
    parentAsin: null, // Track which product this data belongs to
    lastFetched: null
  });

  // State for emotion analysis data persistence
  const [emotionAnalysisData, setEmotionAnalysisData] = useState({
    positiveChartData: null,
    negativeChartData: null,
    contextChartData: null,
    radarData: null,
    analysisStats: null,
    sankeyData: null, // Add Sankey chart data
    parentAsin: null, // Track which product this data belongs to
    lastFetched: null,
    analysisInitiated: false
  });

  // State for loading indicators
  const [loadingStates, setLoadingStates] = useState({
    productDetails: false,
    wordCloud: false,
    emotionAnalysis: false,
    products: false,
    categories: false,
    comparison: false
  });

  // Load selection from URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const parentAsin = urlParams.get('parent_asin');
    const comparison1 = urlParams.get('comparison1');
    const comparison2 = urlParams.get('comparison2');
    
    if (category && parentAsin) {
      setSelectedCategory(category);
      setSelectedProduct(parentAsin);
    }
    
    // Restore comparison selections if they exist
    if (comparison1) {
      setComparisonProduct1(comparison1);
    }
    if (comparison2) {
      setComparisonProduct2(comparison2);
    }
  }, []);

  // Update URL when selection changes (including comparison products)
  useEffect(() => {
    const url = new URL(window.location);
    
    if (selectedCategory && selectedProduct) {
      url.searchParams.set('category', selectedCategory);
      url.searchParams.set('parent_asin', selectedProduct);
    } else {
      url.searchParams.delete('category');
      url.searchParams.delete('parent_asin');
    }
    
    // Handle comparison products in URL
    if (comparisonProduct1) {
      url.searchParams.set('comparison1', comparisonProduct1);
    } else {
      url.searchParams.delete('comparison1');
    }
    
    if (comparisonProduct2) {
      url.searchParams.set('comparison2', comparisonProduct2);
    } else {
      url.searchParams.delete('comparison2');
    }
    
    window.history.replaceState({}, '', url);
  }, [selectedCategory, selectedProduct, comparisonProduct1, comparisonProduct2]);

  // Clear visualization data when product selection changes
  useEffect(() => {
    if (wordCloudData.parentAsin && wordCloudData.parentAsin !== selectedProduct) {
      setWordCloudData({
        data: [],
        reviewsData: [],
        reviewTexts: [],
        parentAsin: null,
        lastFetched: null
      });
    }
    
    if (emotionAnalysisData.parentAsin && emotionAnalysisData.parentAsin !== selectedProduct) {
      setEmotionAnalysisData({
        positiveChartData: null,
        negativeChartData: null,
        contextChartData: null,
        radarData: null,
        analysisStats: null,
        sankeyData: null,
        parentAsin: null,
        lastFetched: null,
        analysisInitiated: false
      });
    }
  }, [selectedProduct, wordCloudData.parentAsin, emotionAnalysisData.parentAsin]);

  // Clear comparison selections when primary product changes
  useEffect(() => {
    if (selectedProduct) {
      // Clear comparison selections when primary product changes
      setComparisonProduct1('');
      setComparisonProduct2('');
    }
  }, [selectedProduct]);

  const updateSelection = (category, productParentAsin, productData = null, productsArray = []) => {
    setSelectedCategory(category);
    setSelectedProduct(productParentAsin);
    setProducts(productsArray);
    
    if (productData) {
      setProductDetails(productData);
    }
  };

  const clearSelection = () => {
    setSelectedCategory('');
    setSelectedProduct('');
    setProductDetails(null);
    setProducts([]);
    // Clear comparison selections
    setComparisonProduct1('');
    setComparisonProduct2('');
    // Note: We don't clear categories as they should persist across sessions
    // Clear all visualization data
    setWordCloudData({
      data: [],
      reviewsData: [],
      reviewTexts: [],
      parentAsin: null,
      lastFetched: null
    });
    setEmotionAnalysisData({
      positiveChartData: null,
      negativeChartData: null,
      contextChartData: null,
      radarData: null,
      analysisStats: null,
      sankeyData: null,
      parentAsin: null,
      lastFetched: null,
      analysisInitiated: false
    });
  };

  // Comparison product management functions
  const updateComparisonProduct1 = (productId) => {
    setComparisonProduct1(productId || '');
  };

  const updateComparisonProduct2 = (productId) => {
    setComparisonProduct2(productId || '');
  };

  const clearComparisonSelections = () => {
    setComparisonProduct1('');
    setComparisonProduct2('');
  };

  const getComparisonProducts = () => {
    const products = [selectedProduct, comparisonProduct1, comparisonProduct2].filter(Boolean);
    return products;
  };

  const hasComparisonSelections = () => {
    return !!(comparisonProduct1 || comparisonProduct2);
  };

  const getSelectedProductTitle = () => {
    if (!selectedProduct || !products.length) return '';
    const product = products.find(p => p.parent_asin === selectedProduct);
    return product?.title || '';
  };

  const getCurrentSelection = () => {
    const selectedProductData = selectedProduct ? products.find(p => p.parent_asin === selectedProduct) : null;
    return {
      category: selectedCategory,
      product: {
        parent_asin: selectedProduct,
        title: getSelectedProductTitle(),
        fullData: selectedProductData
      },
      productDetails,
      hasProducts: products.length > 0,
      isComplete: !!(selectedCategory && selectedProduct),
      canSelectProduct: !!(selectedCategory && products.length > 0)
    };
  };

  // Helper functions to check if data exists
  const hasProductDetailsForCurrent = () => {
    return productDetails && productDetails.parent_asin === selectedProduct;
  };

  const hasWordCloudDataForCurrent = () => {
    return wordCloudData.parentAsin === selectedProduct && wordCloudData.data.length > 0;
  };

  const hasEmotionAnalysisDataForCurrent = () => {
    return emotionAnalysisData.parentAsin === selectedProduct && emotionAnalysisData.analysisInitiated;
  };

  const hasCategoriesLoaded = () => {
    return categories.length > 0;
  };

  // Update loading state
  const setLoadingState = (type, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [type]: isLoading
    }));
  };

  // Store word cloud data
  const storeWordCloudData = (data, reviewsData, reviewTexts) => {
    setWordCloudData({
      data,
      reviewsData,
      reviewTexts,
      parentAsin: selectedProduct,
      lastFetched: new Date().toISOString()
    });
  };

  // Store emotion analysis data
  const storeEmotionAnalysisData = (positiveChartData, negativeChartData, contextChartData, radarData, analysisStats, sankeyData = null) => {
    setEmotionAnalysisData({
      positiveChartData,
      negativeChartData,
      contextChartData,
      radarData,
      analysisStats,
      sankeyData,
      parentAsin: selectedProduct,
      lastFetched: new Date().toISOString(),
      analysisInitiated: true
    });
  };

  const value = {
    // State
    selectedCategory,
    selectedProduct,
    productDetails,
    products,
    categories,
    
    // Comparison state
    comparisonProduct1,
    comparisonProduct2,
    
    // Visualization data
    wordCloudData,
    emotionAnalysisData,
    
    // Loading states
    loadingStates,
    
    // Actions
    updateSelection,
    clearSelection,
    setSelectedCategory,
    setSelectedProduct,
    setProductDetails,
    setProducts,
    setCategories,
    storeWordCloudData,
    storeEmotionAnalysisData,
    setLoadingState,
    
    // Comparison actions
    updateComparisonProduct1,
    updateComparisonProduct2,
    clearComparisonSelections,
    
    // Data checkers
    hasProductDetailsForCurrent,
    hasWordCloudDataForCurrent,
    hasEmotionAnalysisDataForCurrent,
    hasCategoriesLoaded,
    
    // Computed values
    getCurrentSelection,
    getSelectedProductTitle,
    getComparisonProducts,
    
    // Boolean checks
    hasSelection: !!(selectedCategory && selectedProduct),
    hasCompleteSelection: !!(selectedCategory && selectedProduct && products.length > 0),
    hasComparisonSelections: hasComparisonSelections()
  };

  return (
    <ProductSelectionContext.Provider value={value}>
      {children}
    </ProductSelectionContext.Provider>
  );
}; 