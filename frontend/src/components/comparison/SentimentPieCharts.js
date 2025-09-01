import React from 'react';

const SentimentPieCharts = ({ comparisonData, isLoading, error }) => {
  // Helper function to get product name with truncation
  const getProductName = (productData) => {
    return productData?.product_name || 'Unknown Product';
  };

  // Create a single pie chart component matching ProductDashboard style
  const PieChartComponent = ({ productData }) => {
    if (!productData) return null;

    const positivePercentage = productData.summary_distribution?.positive || 0;
    const neutralPercentage = productData.summary_distribution?.neutral || 0;
    const negativePercentage = productData.summary_distribution?.negative || 0;

    return (
      <div className="bg-gray-200 rounded-lg p-4 shadow-sm border border-gray-300">
        {/* Product Title */}
        <div className="text-center mb-4">
          <h4 
            className="font-semibold text-gray-800 text-sm truncate cursor-help"
            title={getProductName(productData)}
            style={{ maxWidth: '250px', margin: '0 auto' }}
          >
            {getProductName(productData)}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {productData.total_reviews} total reviews
          </p>
        </div>

        {/* Pie Chart Container - Compact size */}
        <div className="h-48 flex items-center justify-center">
          <div className="flex items-center justify-center">
            {/* Compact Pie Chart */}
            <div className="relative w-40 h-40">
              <div className="w-full h-full rounded-full bg-gray-300 relative overflow-hidden">
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(
                      #10b981 0% ${positivePercentage}%, 
                      #6b7280 ${positivePercentage}% ${positivePercentage + neutralPercentage}%, 
                      #ef4444 ${positivePercentage + neutralPercentage}% 100%
                    )`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-200 rounded-full w-20 h-20 flex items-center justify-center shadow-sm border border-gray-300">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{positivePercentage.toFixed(0)}%</div>
                      <div className="text-xs text-gray-700 font-medium">Positive</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-4 shadow-lg">
        {/* Professional Header - Compact */}
        <h2 className="text-lg font-semibold text-black mb-1">Sentiment Distribution Overview</h2>
        <p className="text-xs text-black mb-3">Pie charts showing sentiment distribution for each selected product.</p>
        
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-600 text-sm">Loading sentiment overview...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-4 shadow-lg">
        {/* Professional Header - Compact */}
        <h2 className="text-lg font-semibold text-black mb-1">Sentiment Distribution Overview</h2>
        <p className="text-xs text-black mb-3">Pie charts showing sentiment distribution for each selected product.</p>
        
        <div className="text-center py-6">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium text-sm">Error loading sentiment overview</p>
          <p className="text-gray-600 text-xs mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!comparisonData || comparisonData.length === 0) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-4 shadow-lg">
        {/* Professional Header - Compact */}
        <h2 className="text-lg font-semibold text-black mb-1">Sentiment Distribution Overview</h2>
        <p className="text-xs text-black mb-3">Pie charts showing sentiment distribution for each selected product.</p>
        
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm">No sentiment data available for the selected products.</p>
        </div>
      </div>
    );
  }

  // Determine grid layout based on number of products
  const getGridCols = (productCount) => {
    if (productCount === 1) return 'grid-cols-1 max-w-md mx-auto';
    if (productCount === 2) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className="bg-gray-200 border border-gray-400 rounded-xl p-4 shadow-lg">
      {/* Professional Header - Compact */}
      <h2 className="text-lg font-semibold text-black mb-1">Sentiment Distribution Overview</h2>
      <p className="text-xs text-black mb-3">Pie charts showing sentiment distribution for each selected product.</p>
      
      <div className={`grid gap-4 ${getGridCols(comparisonData.length)}`}>
        {comparisonData.map((productData) => {
          if (!productData) return null;
          
          return (
            <PieChartComponent 
              key={productData.parent_asin} 
              productData={productData} 
            />
          );
        })}
      </div>

    </div>
  );
};

export default SentimentPieCharts;
