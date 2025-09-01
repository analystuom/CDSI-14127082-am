import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import * as d3 from 'd3';
import { hexbin } from 'd3-hexbin';
import Card from '../components/ui/Card';
import CalendarHeatmap from '../components/CalendarHeatmap';
import { useProductSelection } from '../contexts/ProductSelectionContext';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const SentimentHexagon = () => {
  const navigate = useNavigate();
  const { selectedProduct, hasSelection } = useProductSelection();
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('hexagon');
  const svgRef = useRef();
  const tooltipRef = useRef();
  
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Summary dropdown state
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Handler for navigating to Product page
  const handleNavigateToProduct = () => {
    navigate('/product');
  };

  // TanStack Query to fetch heatmap data
  const { 
    data: hexagonData, 
    isLoading: dataLoading, 
    error: dataError,
    refetch 
  } = useQuery({
    queryKey: ['hexagonData', selectedProduct],
    queryFn: async () => {
      console.log('Fetching hexagon data for:', selectedProduct);
      const response = await axios.get('/api/reviews/for-heatmap', {
        params: { parent_asin: selectedProduct },
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!selectedProduct, // Only fetch when product is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // D3 Hexbin Visualization Effect
  useEffect(() => {
    if (!hexagonData || !hexagonData.length || !svgRef.current || activeTab !== 'hexagon') return;

    console.log(`Rendering hexagon visualization with ${hexagonData.length} individual reviews`);

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Set up dimensions to maximize screen usage without scrolling container
    const containerWidth = Math.min(window.innerWidth - 100, 1400); // Responsive width with max limit
    const margin = { top: 15, right: 15, bottom: 15, left: 15 };
    
    // Generate grid positions for ALL reviews using hexagonal packing
    const hexRadius = 10; // Slightly smaller radius to fit more
    const hexWidth = hexRadius * 2 * Math.sin(Math.PI / 3);
    const hexHeight = hexRadius * 1.5;
    
    // Calculate how many hexagons can fit per row
    const hexagonsPerRow = Math.floor((containerWidth - margin.left - margin.right) / hexWidth);
    
    // Calculate required rows for all reviews
    const totalRows = Math.ceil(hexagonData.length / hexagonsPerRow);
    
    // Calculate dynamic height based on number of rows needed
    const dynamicHeight = margin.top + margin.bottom + (totalRows * hexHeight) + hexRadius;
    
    // Create SVG with responsive width and dynamic height
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", dynamicHeight);
    
    // Create hexbin layout
    const hexbinGenerator = hexbin()
      .radius(hexRadius)
      .extent([[margin.left, margin.top], [containerWidth - margin.right, dynamicHeight - margin.bottom]]);
    
    // Position ALL reviews in a hexagonal grid
    const reviewsWithPositions = hexagonData.map((review, index) => {
      const row = Math.floor(index / hexagonsPerRow);
      const col = index % hexagonsPerRow;
      
      // Offset every other row for hexagonal packing
      const offsetX = (row % 2) * (hexWidth / 2);
      
      const x = margin.left + col * hexWidth + hexWidth / 2 + offsetX;
      const y = margin.top + row * hexHeight + hexRadius;
      
      return {
        ...review,
        x,
        y
      };
    });
    
    // Color scale based on rating intensity
    const positiveColorScale = d3.scaleLinear()
      .domain([4, 5])
      .range(['#86efac', '#10b981']); // Light green to dark green
    
    const negativeColorScale = d3.scaleLinear()
      .domain([1, 2])
      .range(['#ef4444', '#fca5a5']); // Dark red to light red
    
    const neutralColor = '#9ca3af'; // Grey color for neutral sentiment
    
    // Function to get color based on rating with new float-based rules
    // 1.0-2.9 = negative, 3.0-3.9 = neutral, 4.0-5.0 = positive
    const getColor = (rating) => {
      if (rating >= 4.0) {
        return positiveColorScale(rating);
      } else if (rating < 3.0) {
        return negativeColorScale(rating);
      } else {
        return neutralColor; // 3.0-3.9 rating = neutral
      }
    };
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    // Draw hexagons for each review
    svg.selectAll(".hexagon")
      .data(reviewsWithPositions)
      .enter().append("path")
      .attr("class", "hexagon")
      .attr("d", hexbinGenerator.hexagon())
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("fill", d => getColor(d.rating))
      .style("stroke", "#fff")
      .style("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Show tooltip with review details
        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="bg-gray-200 p-4 rounded-lg shadow-lg border max-w-xs">
              <div class="font-semibold text-sm mb-2">Review Details</div>
              <div class="text-xs space-y-2">
                <div class="flex justify-between">
                  <span>Rating:</span> 
                  <span class="font-semibold ${d.rating >= 4.0 ? 'text-green-600' : d.rating < 3.0 ? 'text-red-600' : 'text-gray-600'}">
                    ${d.rating}/5 ${'★'.repeat(Math.floor(d.rating))}${'☆'.repeat(5-Math.floor(d.rating))}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Sentiment:</span> 
                  <span class="font-semibold ${d.sentiment === 'positive' ? 'text-green-600' : d.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'}">
                    ${d.sentiment}
                  </span>
                </div>
                <div class="border-t pt-2">
                  <div class="font-medium text-gray-700 mb-1">Review:</div>
                  <div class="text-black leading-relaxed">${d.review_snippet}</div>
                </div>
              </div>
            </div>
          `);
        
        // Highlight hexagon
        d3.select(this)
          .style("stroke", "#000")
          .style("stroke-width", 2);
      })
      .on("mouseout", function() {
        // Hide tooltip
        tooltip.style("opacity", 0);
        
        // Remove highlight
        d3.select(this)
          .style("stroke", "#fff")
          .style("stroke-width", 1);
      });
    
    console.log(`Rendered all ${reviewsWithPositions.length} individual review hexagons (${hexagonsPerRow} per row, ${totalRows} rows, container width: ${containerWidth}px)`);
    
  }, [hexagonData, activeTab]);

  // Process calendar heatmap data (following SentimentTimeline pattern)
  const processCalendarData = (reviewData) => {
    if (!reviewData || !Array.isArray(reviewData)) {
      return [];
    }

    // Group reviews by date and calculate daily sentiment scores
    const dailyData = {};
    
    reviewData.forEach(review => {
      if (!review.timestamp) return;
      
      // Convert timestamp properly like the backend aggregation pipeline
      let timestampSeconds;
      if (typeof review.timestamp === 'string') {
        timestampSeconds = parseInt(review.timestamp, 10);
      } else {
        timestampSeconds = review.timestamp;
      }
      
      // Handle milliseconds vs seconds (like the backend does)
      if (timestampSeconds > 1000000000000) {
        timestampSeconds = timestampSeconds / 1000;
      }
      
      // Convert to date string in YYYY-MM-DD format
      const date = new Date(timestampSeconds * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0
        };
      }
      
      // Aggregate sentiment scores (+1 for positive, 0 for neutral, -1 for negative)
      if (review.sentiment === 'positive') {
        dailyData[dateStr].positive += 1;
      } else if (review.sentiment === 'neutral') {
        dailyData[dateStr].neutral += 1;
      } else if (review.sentiment === 'negative') {
        dailyData[dateStr].negative += 1;
      }
      
      dailyData[dateStr].total += 1;
    });
    
    // Convert to array format expected by CalendarHeatmap component
    return Object.entries(dailyData).map(([date, counts]) => {
      // Calculate average daily sentiment score
      // Positive sentiment = +1, Neutral sentiment = 0, Negative sentiment = -1
      const positiveScore = counts.positive;
      const neutralScore = counts.neutral;
      const negativeScore = counts.negative;
      const totalScore = positiveScore - negativeScore; // Neutral doesn't affect score
      const averageScore = counts.total > 0 ? totalScore / counts.total : 0;
      
      return {
        date,
        score: averageScore // This will be positive for positive days, negative for negative days, and neutral affects towards 0
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Get calendar data from the same hexagon data
  const calendarData = processCalendarData(hexagonData);
  
  // Debug logging for timestamp processing
  useEffect(() => {
    if (hexagonData && hexagonData.length > 0) {
      console.log('Sample hexagon data for calendar processing:', hexagonData.slice(0, 3));
      console.log('Processed calendar data sample:', calendarData.slice(0, 5));
      console.log('Date range in calendar data:', 
        calendarData.length > 0 ? `${calendarData[0].date} to ${calendarData[calendarData.length - 1].date}` : 'No data');
    }
  }, [hexagonData, calendarData]);

  // Handle errors
  useEffect(() => {
    if (dataError) {
      setError('Failed to load hexagon data. Please try again.');
      console.error('Hexagon data error:', dataError);
    } else {
      setError('');
    }
  }, [dataError]);

  // Helper function to generate dynamic insights summary
  const generateSentimentInsights = () => {
    if (!hexagonData || hexagonData.length === 0) {
      return null;
    }

    // Calculate sentiment distribution
    const positiveReviews = hexagonData.filter(r => r.sentiment === 'positive').length;
    const neutralReviews = hexagonData.filter(r => r.sentiment === 'neutral').length;
    const negativeReviews = hexagonData.filter(r => r.sentiment === 'negative').length;
    const totalReviews = hexagonData.length;

    // Calculate percentages
    const positivePercentage = Math.round((positiveReviews / totalReviews) * 100);
    const neutralPercentage = Math.round((neutralReviews / totalReviews) * 100);
    const negativePercentage = Math.round((negativeReviews / totalReviews) * 100);

    // Calculate rating distribution
    const ratings = hexagonData.map(r => r.rating).filter(r => r && !isNaN(r));
    const avgRating = ratings.length > 0 ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 'N/A';
    
    // Rating distribution
    const fiveStarReviews = hexagonData.filter(r => r.rating === 5).length;
    const fourStarReviews = hexagonData.filter(r => r.rating === 4).length;
    const threeStarReviews = hexagonData.filter(r => r.rating === 3).length;
    const twoStarReviews = hexagonData.filter(r => r.rating === 2).length;
    const oneStarReviews = hexagonData.filter(r => r.rating === 1).length;

    // Calendar data analysis
    const calendarInsights = calendarData && calendarData.length > 0 ? {
      totalDays: calendarData.length,
      positiveDays: calendarData.filter(d => d.score > 0).length,
      neutralDays: calendarData.filter(d => d.score === 0).length,
      negativeDays: calendarData.filter(d => d.score < 0).length,
      dateRange: calendarData.length > 0 ? {
        start: calendarData[0].date,
        end: calendarData[calendarData.length - 1].date
      } : null
    } : null;

    // Generate hexagon insights
    const hexagonInsights = [
      `Total of ${totalReviews.toLocaleString()} individual reviews visualized as hexagons`,
      `${positiveReviews.toLocaleString()} positive reviews (${positivePercentage}%) shown in green hexagons`,
      `${neutralReviews.toLocaleString()} neutral reviews (${neutralPercentage}%) shown in gray hexagons`,
      `${negativeReviews.toLocaleString()} negative reviews (${negativePercentage}%) shown in red hexagons`,
      `Average customer rating: ${avgRating} out of 5.0 stars`,
      `Rating breakdown: ${fiveStarReviews} five-star, ${fourStarReviews} four-star, ${threeStarReviews} three-star, ${twoStarReviews} two-star, ${oneStarReviews} one-star reviews`
    ];

    // Generate calendar insights if available
    const calendarInsightsList = calendarInsights ? [
      `Calendar heatmap spans ${calendarInsights.totalDays} days with review activity`,
      `Date range: ${calendarInsights.dateRange?.start} to ${calendarInsights.dateRange?.end}`,
      `${calendarInsights.positiveDays} days with net positive sentiment (${Math.round((calendarInsights.positiveDays / calendarInsights.totalDays) * 100)}%)`,
      `${calendarInsights.neutralDays} days with neutral sentiment (${Math.round((calendarInsights.neutralDays / calendarInsights.totalDays) * 100)}%)`,
      `${calendarInsights.negativeDays} days with net negative sentiment (${Math.round((calendarInsights.negativeDays / calendarInsights.totalDays) * 100)}%)`
    ] : [
      'Calendar heatmap data not available - reviews may be missing timestamp information'
    ];

    // Generate overall assessment
    let overallAssessment = [];
    if (positivePercentage > 60) {
      overallAssessment.push('Customer sentiment is predominantly positive with strong satisfaction indicators');
    } else if (negativePercentage > 50) {
      overallAssessment.push('Customer sentiment shows concerning negative patterns requiring attention');
    } else {
      overallAssessment.push('Customer sentiment shows mixed feedback with room for improvement');
    }

    if (avgRating !== 'N/A') {
      if (parseFloat(avgRating) >= 4.0) {
        overallAssessment.push('High average rating indicates strong customer satisfaction');
      } else if (parseFloat(avgRating) >= 3.0) {
        overallAssessment.push('Moderate average rating suggests acceptable but improvable customer experience');
      } else {
        overallAssessment.push('Low average rating indicates significant customer satisfaction issues');
      }
    }

    return {
      hexagonInsights,
      calendarInsights: calendarInsightsList,
      overallAssessment,
      summary: {
        totalReviews,
        positivePercentage,
        neutralPercentage,
        negativePercentage,
        avgRating,
        sentimentLevel: positivePercentage > negativePercentage * 1.5 ? 'positive' : negativePercentage > positivePercentage * 1.5 ? 'negative' : 'mixed'
      }
    };
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <div style={styles.titleContainer}>
          <h1 className="text-3xl font-bold text-black mb-2" style={styles.title}>Sentiment Heatmap</h1>
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
              aria-label="Information about Sentiment Heatmap"
            >
              <svg style={styles.tooltipIcon} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div style={styles.tooltip}>
                <div style={styles.tooltipContent}>
                  <h3 style={styles.tooltipTitle}>About Sentiment Heatmap</h3>
                  <p style={styles.tooltipText}>
                    Explore customer sentiment through interactive visualizations that reveal patterns in review data:
                  </p>
                  <ul style={styles.tooltipList}>
                    <li><strong>Sentiment Hexagon:</strong> Individual review visualization where each hexagon represents one review with color-coded sentiment</li>
                    <li><strong>Interactive Tooltips:</strong> Hover over hexagons to see detailed review information, ratings, and sentiment analysis</li>
                    <li><strong>Calendar Heatmap:</strong> Daily sentiment trends over time showing positive, neutral, and negative patterns</li>
                  </ul>
                  <p style={styles.tooltipText}>
                    <strong>Note:</strong> Select a product on the Product Selection page to view sentiment heatmap visualizations.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div style={styles.tooltipArrow}></div>
              </div>
            )}
          </div>
        </div>
        <p className="text-lg text-black">Multi-dimensional sentiment analysis visualization</p>
      </div>

      {/* Dynamic Insights Summary */}
      {hasSelection && !dataLoading && !error && hexagonData && hexagonData.length > 0 && (() => {
        const insights = generateSentimentInsights();
        if (!insights) return null;

        return (
          <div style={styles.summaryCard}>
            <div style={styles.summaryHeader}>
              <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#bfdbfe'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dbeafe'}
                style={styles.summaryToggle}
              >
                <div style={styles.summaryHeaderContent}>
                  <div style={styles.summaryIcon}>
                    <svg style={styles.summaryIconSvg} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div style={styles.summaryTitleContainer}>
                    <h4 style={styles.summaryToggleTitle}>
                      Click to {summaryExpanded ? 'hide' : 'view'} detailed sentiment heatmap analysis
                    </h4>
                    <p style={styles.summaryToggleSubtitle}>
                      Hexagon visualization and calendar heatmap insights
                    </p>
                  </div>
                </div>
                <div style={styles.summaryArrowContainer}>
                  <svg 
                    style={{...styles.summaryArrow, transform: summaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expandable Content */}
              {summaryExpanded && (
                <div style={styles.summaryContent}>
                  {/* Hexagon Visualization Analysis */}
                  <div style={styles.insightSection}>
                    <div style={styles.insightHeader}>
                      <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                      <h5 style={styles.insightTitle}>Hexagon Visualization Analysis</h5>
                    </div>
                    <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                      <ul style={styles.insightList}>
                        {insights.hexagonInsights.map((insight, index) => (
                          <li key={index} style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Calendar Heatmap Analysis */}
                  <div style={styles.insightSection}>
                    <div style={styles.insightHeader}>
                      <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                      <h5 style={styles.insightTitle}>Calendar Heatmap Analysis</h5>
                    </div>
                    <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                      <ul style={styles.insightList}>
                        {insights.calendarInsights.map((insight, index) => (
                          <li key={index} style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Overall Assessment */}
                  <div style={styles.insightSection}>
                    <div style={styles.insightHeader}>
                      <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                      <h5 style={styles.insightTitle}>Overall Assessment</h5>
                    </div>
                    <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                      <ul style={styles.insightList}>
                        {insights.overallAssessment.map((assessment, index) => (
                          <li key={index} style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{assessment}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* No Product Selected Message */}
      {!hasSelection && (
        <Card>
          <div 
            className="text-center cursor-pointer hover:bg-gray-200 transition-colors rounded-lg p-2" 
            onClick={handleNavigateToProduct}
          >
            <h3 className="text-lg font-semibold text-black mb-2">No product selected</h3>
            <p className="text-black">
              Go to the <strong>Product</strong> page to select a product for hexagon sentiment analysis.
            </p>
          </div>
        </Card>
      )}

      {/* Visualization Section with Tabs */}
      {hasSelection && (
        <Card title="Interactive Sentiment Heatmap" subtitle="Explore sentiment analysis through different heatmaps">
          {dataLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-black">Loading sentiment data...</span>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {hexagonData && hexagonData.length > 0 && (
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('hexagon')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'hexagon'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Sentiment Hexagon
                  </button>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'calendar'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Calendar Heatmap
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'hexagon' && (
                <div className="space-y-4">
                  <p className="text-sm text-black">
                    Individual review visualization - each hexagon represents one review
                  </p>
                  
                  {/* Hexagon Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm bg-gray-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="font-semibold text-black">Total Reviews</div>
                      <div className="text-lg text-blue-600">{hexagonData.length}</div>
                      <div className="text-xs text-gray-500">All displayed below</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black">Positive Reviews</div>
                      <div className="text-lg text-green-600">
                        {hexagonData.filter(r => r.sentiment === 'positive').length}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((hexagonData.filter(r => r.sentiment === 'positive').length / hexagonData.length) * 100)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black">Neutral Reviews</div>
                      <div className="text-lg text-gray-600">
                        {hexagonData.filter(r => r.sentiment === 'neutral').length}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((hexagonData.filter(r => r.sentiment === 'neutral').length / hexagonData.length) * 100)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black">Negative Reviews</div>
                      <div className="text-lg text-red-600">
                        {hexagonData.filter(r => r.sentiment === 'negative').length}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((hexagonData.filter(r => r.sentiment === 'negative').length / hexagonData.length) * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Hexagon Legend */}
                  <div className="flex justify-center space-x-6 text-sm">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                      <span>Positive</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                      <span>Neutral</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                      <span>Negative</span>
                    </div>
                  </div>
                  
                  {/* SVG Visualization - Full Height Display */}
                  <div className="bg-gray-200 rounded-lg p-4 min-h-96">
                    <div className="flex justify-center w-full">
                      <svg ref={svgRef} className="border border-gray-200 rounded-lg w-full max-w-full"></svg>
                    </div>
                  </div>
                  
                  {/* Hexagon Instructions */}
                  <div className="text-center text-sm text-black space-y-1">
                    <div>Each hexagon represents a single review. Hover to see the review text and rating.</div>
                    <div className="text-blue-600 font-medium">
                      All {hexagonData.length} reviews are displayed
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'calendar' && calendarData && (
                <div className="space-y-4">
                  <p className="text-sm text-black">
                    Daily sentiment trends over time for the selected product
                  </p>
                  
                  {calendarData.length > 0 ? (
                    <>
                      {/* Calendar Statistics */}
                      {/* <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm bg-gray-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="font-semibold text-black">Total Years</div>
                          <div className="text-lg text-blue-600">
                            {[...new Set(calendarData.map(d => new Date(d.date).getFullYear()))].length}
                          </div>
                          <div className="text-xs text-gray-500">Years with data</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-black">Date Range</div>
                          <div className="text-lg text-purple-600">
                            {calendarData.length > 0 ? 
                              `${calendarData[0].date.split('-')[0]} - ${calendarData[calendarData.length - 1].date.split('-')[0]}` : 
                              'No data'}
                          </div>
                          <div className="text-xs text-gray-500">Year span</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-black">Positive Days</div>
                          <div className="text-lg text-green-600">
                            {calendarData.filter(d => d.score > 0).length}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((calendarData.filter(d => d.score > 0).length / calendarData.length) * 100)}% of active days
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-black">Neutral Days</div>
                          <div className="text-lg text-gray-600">
                            {calendarData.filter(d => d.score === 0).length}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((calendarData.filter(d => d.score === 0).length / calendarData.length) * 100)}% of active days
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-black">Negative Days</div>
                          <div className="text-lg text-red-600">
                            {calendarData.filter(d => d.score < 0).length}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((calendarData.filter(d => d.score < 0).length / calendarData.length) * 100)}% of active days
                          </div>
                        </div>
                      </div> */}
                      
                      {/* Calendar Heatmap Component */}
                      <div className="bg-gray-200 p-6 rounded-lg border border-gray-200">
                        <CalendarHeatmap data={calendarData} />
                      </div>
                      
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-black">No calendar data available - reviews may be missing timestamps.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {hexagonData && hexagonData.length === 0 && (
            <div className="text-center py-8">
              <div className="text-black">No review data available for this product.</div>
            </div>
          )}
        </Card>
      )}

      {/* Tooltip container */}
      <div 
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 z-50"
        style={{ transition: 'opacity 0.3s' }}
      ></div>
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
    fontSize: '28px',
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
  },
  summaryCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    border: '1px solid #d1d5db'
  },
  summaryHeader: {
    borderRadius: '8px'
  },
  summaryToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#dbeafe',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
    outline: 'none'
  },
  summaryHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  summaryIcon: {
    flexShrink: 0
  },
  summaryIconSvg: {
    width: '20px',
    height: '20px',
    color: '#2563eb'
  },
  summaryTitleContainer: {
    textAlign: 'left'
  },
  summaryToggleTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: '0'
  },
  summaryToggleSubtitle: {
    fontSize: '12px',
    color: '#1d4ed8',
    marginTop: '4px',
    margin: '4px 0 0 0'
  },
  summaryArrowContainer: {
    flexShrink: 0
  },
  summaryArrow: {
    width: '20px',
    height: '20px',
    color: '#2563eb',
    transition: 'transform 0.2s ease'
  },
  summaryContent: {
    borderTop: '1px solid #d1d5db',
    padding: '16px 20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '0 0 8px 8px'
  },
  insightSection: {
    marginBottom: '24px'
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  insightIndicator: {
    width: '12px',
    height: '12px',
    backgroundColor: '#6b7280',
    borderRadius: '3px'
  },
  insightTitle: {
    fontWeight: '600',
    color: '#111827',
    margin: '0'
  },
  insightContent: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px'
  },
  insightList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  insightListItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  insightBullet: {
    color: '#6b7280',
    marginRight: '8px',
    fontSize: '16px',
    lineHeight: '1.5',
    flexShrink: 0
  },
  insightText: {
    color: '#000000',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0'
  }
};

export default SentimentHexagon; 