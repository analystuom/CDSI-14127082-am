import React from 'react';

const SentimentDistributionComparison = ({ comparisonData, isLoading, error }) => {
  // Helper function to get product name with truncation
  const getProductName = (productData) => {
    return productData?.product_name || 'Unknown Product';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Distribution Comparison</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading comparison data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Distribution Comparison</h3>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Error loading comparison data</p>
          <p className="text-gray-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!comparisonData || comparisonData.length === 0) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Distribution Comparison</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No comparison data available for the selected products.</p>
        </div>
      </div>
    );
  }

  // Calculate max reviews for scaling the bars
  const maxReviews = Math.max(...comparisonData.map(p => p.total_reviews));

  return (
    <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Distribution Comparison</h3>
      <div className="max-w-4xl mx-auto">
        {/* Stacked Bar Chart - Positive vs Negative Reviews */}
        <div className="bg-gray-200 rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {comparisonData.map((productData) => {
              if (!productData) return null;
              
              // Use actual counts if available from backend, otherwise calculate from percentages
              const positiveReviews = productData.actual_positive_count || Math.round((productData.total_reviews * productData.summary_distribution.positive) / 100);
              const neutralReviews = productData.actual_neutral_count || Math.round((productData.total_reviews * (productData.summary_distribution.neutral || 0)) / 100);
              const negativeReviews = productData.actual_negative_count || Math.round((productData.total_reviews * (productData.summary_distribution.negative || 0)) / 100);
              
              const positivePercent = productData.summary_distribution.positive;
              const neutralPercent = productData.summary_distribution.neutral || 0;
              const negativePercent = productData.summary_distribution.negative || (100 - positivePercent - neutralPercent);
              
              return (
                <div key={productData.parent_asin} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-48" title={getProductName(productData)}>
                      {getProductName(productData)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {productData.total_reviews} reviews
                    </span>
                  </div>
                  <div className="flex h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(positiveReviews / maxReviews) * 100}%` }}
                    >
                      {positiveReviews > 0 && positiveReviews}
                    </div>
                    <div 
                      className="bg-gray-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(neutralReviews / maxReviews) * 100}%` }}
                    >
                      {neutralReviews > 0 && neutralReviews}
                    </div>
                    <div 
                      className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(negativeReviews / maxReviews) * 100}%` }}
                    >
                      {negativeReviews > 0 && negativeReviews}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="text-green-600">{positivePercent.toFixed(1)}% positive</span>
                    {neutralPercent > 0 && (
                      <span className="text-gray-600">{neutralPercent.toFixed(1)}% neutral</span>
                    )}
                    <span className="text-red-600">{negativePercent.toFixed(1)}% negative</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Positive Reviews</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
              <span>Neutral Reviews</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>Negative Reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentDistributionComparison;
