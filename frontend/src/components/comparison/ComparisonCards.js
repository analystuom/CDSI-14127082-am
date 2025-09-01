import React from 'react';
import Card from '../ui/Card';

// Comprehensive Sentiment Summary Card Component
export const SentimentSummaryCard = ({ productData }) => {
  const { 
    summary_distribution, 
    product_name, 
    top_words, 
    total_reviews, 
    average_rating, 
    hexagon_seed,
    overall_sentiment 
  } = productData;
  
  // Calculate review counts
  const positiveReviews = Math.round((total_reviews * summary_distribution.positive) / 100);
  const negativeReviews = total_reviews - positiveReviews;
  
  // Helper function for hexagon heatmap generation
  const generateHexagonHeatmap = () => {
    const hexagons = [];
    const hexRadius = 4.5; // Smaller for the card view
    const mapColumns = 28; 
    const mapRows = 22;
    
    const seed = hexagon_seed || 1000;
    let randomIndex = 0;
    const seededRandom = () => {
      const x = Math.sin(seed + randomIndex++) * 10000;
      return x - Math.floor(x);
    };
    
    let hexIndex = 0;
    for (let i = 0; i < mapRows && hexIndex < 800; i++) {
      for (let j = 0; j < mapColumns && hexIndex < 800; j++) {
        let x = hexRadius * j * Math.sqrt(3);
        
        if (i % 2 === 1) {
          x += (hexRadius * Math.sqrt(3)) / 2;
        }
        
        const y = hexRadius * i * 1.5;
        
        if (x > 280 || y > 180) continue;
        
        const sentimentType = seededRandom() * 100;
        let fillColor;
        if (sentimentType < summary_distribution.positive) {
          fillColor = sentimentType < summary_distribution.positive * 0.7 ? '#10b981' : '#6ee7b7';
        } else {
          fillColor = sentimentType < summary_distribution.positive + (summary_distribution.negative * 0.5) ? '#ef4444' : '#dc2626';
        }
        
        const hexPath = `M${x},${y - hexRadius}L${x + hexRadius * Math.cos(Math.PI/6)},${y - hexRadius/2}L${x + hexRadius * Math.cos(Math.PI/6)},${y + hexRadius/2}L${x},${y + hexRadius}L${x - hexRadius * Math.cos(Math.PI/6)},${y + hexRadius/2}L${x - hexRadius * Math.cos(Math.PI/6)},${y - hexRadius/2}Z`;
        
        hexagons.push(
          <path
            key={hexIndex}
            d={hexPath}
            fill={fillColor}
            stroke="white"
            strokeWidth="0.5"
          />
        );
        
        hexIndex++;
      }
    }
    
    return hexagons;
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-black';
    }
  };
  
  return (
    <Card>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-black">Sentiment Summary</h3>
          <p className="text-sm text-black">Analysis based on customer reviews and ratings</p>
        </div>
        
        {/* Sentiment Metrics */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{positiveReviews}</div>
            <div className="text-xs text-black">Positive Reviews</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{negativeReviews}</div>
            <div className="text-xs text-black">Negative Reviews</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-black">{total_reviews}</div>
            <div className="text-xs text-black">Total Reviews</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{average_rating}</div>
            <div className="text-xs text-black">Avg Rating</div>
          </div>
        </div>
        
        {/* Sentiment Pie Chart */}
        <div className="bg-gray-200 rounded-lg p-4 text-center">
          <div className="relative w-36 h-36 mx-auto mb-3">
            <div className="w-full h-full rounded-full bg-gray-300 relative overflow-hidden">
              <div 
                className="absolute inset-0 bg-green-500 rounded-full"
                style={{
                  background: `conic-gradient(#10b981 0% ${summary_distribution.positive}%, #d1d5db ${summary_distribution.positive}% 100%)`
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gray-200 rounded-full w-24 h-24 flex items-center justify-center">
                  <span className="text-lg font-bold text-black">{summary_distribution.positive.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-black">
            Average Sentiment is <span className={`font-semibold ${summary_distribution.positive >= 60 ? 'text-green-600' : summary_distribution.positive >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {summary_distribution.positive >= 60 ? 'positive' : summary_distribution.positive >= 40 ? 'mixed' : 'negative'}
            </span>
          </p>
        </div>
        
        {/* Sentiment Hexagon Heatmap */}
        <div className="bg-gray-200 rounded-lg p-4">
          <div className="flex justify-center mb-3">
            <svg width="290" height="190" viewBox="0 0 290 190">
              {generateHexagonHeatmap()}
            </svg>
          </div>
          <p className="text-xs text-black text-center">
            The heatmap represents the sentiment of the latest reviews
          </p>
        </div>
        
        {/* Top Words */}
        <div className="bg-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-black mb-3 text-center">
            Top words used in the reviews
          </h4>
          <div className="space-y-1">
            {top_words.slice(0, 10).map((wordData, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="w-6 text-black font-medium">{index + 1}.</span>
                  <span className={`font-medium ${getSentimentColor(wordData.sentiment)}`}>
                    {wordData.word}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  ({wordData.total_count || 'N/A'})
                </span>
              </div>
            ))}
            {top_words.length === 0 && (
              <p className="text-sm text-black text-center py-4">
                No words data available
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Overall Sentiment Card Component (keeping for compatibility)
export const OverallSentimentCard = ({ productData }) => {
  const { overall_sentiment, product_name } = productData;
  
  const isPositive = overall_sentiment.label === 'Positive';
  
  return (
    <Card>
      <div className="text-center">
        <h3 className="text-sm font-medium text-black mb-2">
          The overall average sentiment for '{product_name}' is:
        </h3>
        <div className={`text-lg font-semibold mb-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {overall_sentiment.label} ({overall_sentiment.value}%)
        </div>
      </div>
    </Card>
  );
};

// Summary Distribution Card Component (Donut Chart) - keeping for compatibility
export const SummaryDistributionCard = ({ productData }) => {
  const { summary_distribution, product_name } = productData;
  
  // Calculate the circumference and stroke-dasharray for the donut chart
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const positiveStroke = (summary_distribution.positive / 100) * circumference;
  const negativeStroke = (summary_distribution.negative / 100) * circumference;
  
  return (
    <Card>
      <div className="text-center">
        <h3 className="text-sm font-medium text-black mb-4">
          Summary of Tweets for '{product_name}'
        </h3>
        
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="transparent"
            />
            
            {/* Positive segment */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#10b981"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={`${positiveStroke} ${circumference}`}
              strokeDashoffset="0"
              className="transition-all duration-1000 ease-in-out"
            />
            
            {/* Negative segment */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#ef4444"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={`${negativeStroke} ${circumference}`}
              strokeDashoffset={`-${positiveStroke}`}
              className="transition-all duration-1000 ease-in-out"
            />
          </svg>
          
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700">{product_name}</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Positive</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>Negative</span>
          </div>
        </div>
        
        {/* Percentages */}
        <div className="mt-3 text-xs text-black">
          <div className="text-green-600">Positive: {summary_distribution.positive}%</div>
          <div className="text-red-600">Negative: {summary_distribution.negative}%</div>
        </div>
      </div>
    </Card>
  );
};

// Top Words Card Component - keeping for compatibility
export const TopWordsCard = ({ productData }) => {
  const { top_words, product_name } = productData;
  
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-black';
    }
  };
  
  return (
    <Card>
      <div>
        <h3 className="text-sm font-medium text-black mb-4">
          Top words used in '{product_name}' Tweets
        </h3>
        
        <div className="space-y-2">
          {top_words.map((wordData, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="w-6 text-black font-medium">{index + 1}.</span>
                <span className={`font-medium ${getSentimentColor(wordData.sentiment)}`}>
                  {wordData.word}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                ({wordData.total_count})
              </span>
            </div>
          ))}
        </div>
        
        {top_words.length === 0 && (
          <p className="text-sm text-black text-center py-4">
            No words data available
          </p>
        )}
      </div>
    </Card>
  );
};

// Updated Product Column Component to use the comprehensive sentiment summary
export const ProductComparisonColumn = ({ productData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }
  
  if (!productData) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-black">No data available for this product</p>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <SentimentSummaryCard productData={productData} />
    </div>
  );
}; 