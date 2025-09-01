import React, { useMemo } from 'react';

const DashboardSentimentPieChart = ({ sentimentData: rawSentimentData, isLoading, error }) => {
  // Transform the unified API data to match the expected format for the UI
  const sentimentData = useMemo(() => {
    if (!rawSentimentData) return null;
    
    console.log('Raw sentiment pie data from unified API:', rawSentimentData);
    
    // Transform unified API data format
    const positive = rawSentimentData.summary_distribution?.positive || 0;
    const neutral = rawSentimentData.summary_distribution?.neutral || 0;
    const negative = rawSentimentData.summary_distribution?.negative || 0;
    const totalReviews = rawSentimentData.total_reviews || 0;
    
    // Use actual counts from the unified API
    const positiveReviews = rawSentimentData.sentiment_counts?.positive || 0;
    const neutralReviews = rawSentimentData.sentiment_counts?.neutral || 0;
    const negativeReviews = rawSentimentData.sentiment_counts?.negative || 0;
    
    const transformedData = {
      positivePercentage: positive,
      neutralPercentage: neutral,
      negativePercentage: negative,
      totalReviews: totalReviews,
      positiveReviews: positiveReviews,
      neutralReviews: neutralReviews,
      negativeReviews: negativeReviews,
      rating: rawSentimentData.average_rating?.toFixed(1) || '0.0'
    };
    
    console.log('Transformed sentiment pie data for UI:', transformedData);
    return transformedData;
  }, [rawSentimentData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-black">Sentiment Distribution</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-black">Sentiment Distribution</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-red-400 mb-2">⚠️</div>
            <p className="text-xs text-red-500">Error loading data</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!sentimentData) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-black">Sentiment Distribution</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-gray-400 mb-2">📊</div>
            <p className="text-xs text-gray-500">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Professional Header */}
      <h2 className="text-xl font-semibold text-black mb-1">Sentiment Distribution</h2>
      <p className="text-sm text-black mb-4">Overall sentiment breakdown displayed as a pie chart with percentages.</p>
      
      {/* Pie Chart Container with Side-by-Side Layout */}
      <div className="h-96 flex items-center justify-center">
        <div className="flex items-center space-x-8">
          {/* Larger Pie Chart */}
          <div className="relative w-72 h-72">
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
                <div className="bg-white rounded-full w-40 h-40 flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{(sentimentData.positivePercentage || 0).toFixed(0)}%</div>
                    <div className="text-lg text-gray-600">Positive</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right-Side Legend */}
          <div className="flex flex-col space-y-3 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <div className="flex flex-col">
                <span className="text-gray-700">Positive</span>
                <span className="font-semibold text-green-600">{(sentimentData.positivePercentage || 0).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-500 rounded-full mr-3"></div>
              <div className="flex flex-col">
                <span className="text-gray-700">Neutral</span>
                <span className="font-semibold text-gray-600">{(sentimentData.neutralPercentage || 0).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
              <div className="flex flex-col">
                <span className="text-gray-700">Negative</span>
                <span className="font-semibold text-red-600">{(sentimentData.negativePercentage || 0).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSentimentPieChart;
