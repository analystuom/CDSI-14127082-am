import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { ComparisonIcon, ProductIcon } from '../components/Icons';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import {
  useMultiProductComparison, 
  useProductsByCategory, 
  usePreloadComparisonData,
  useComparisonDataAvailability,
  useMultiProductTimelineComparison,
  useMultiProductYearlyTimelineComparison,
  useComprehensiveProductStats
} from '../hooks/useComparisonQueries';
import { useSentimentTrends, useProductDateRange } from '../hooks/useNewSentimentQueries';
import ComparisonDropdown from '../components/comparison/ComparisonDropdown';
import wordcloudImage from '../assets/images/prodcompare.jpg';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ProductComparison = ({ selectedProduct: selectedProductProp }) => {
  const navigate = useNavigate();
  const { 
    selectedProduct, 
    getSelectedProductTitle, 
    hasSelection,
    comparisonProduct1,
    comparisonProduct2,
    updateComparisonProduct1,
    updateComparisonProduct2,
    getComparisonProducts
  } = useProductSelection();
  
  // Use the prop if provided, otherwise fall back to context
  const currentSelectedProduct = selectedProductProp || selectedProduct;
  
  // Tab state for layout switching
  const [activeTab, setActiveTab] = useState('sentiment');
  
  // Date filter states for timeline
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Scatter chart metric state
  const [selectedMetric, setSelectedMetric] = useState('total_positive');
  
  // Applied filter states (only updated when Apply Filter is clicked)
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  
  // Tooltip state for page header
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Dropdown state for product selection
  const [showProductSelection, setShowProductSelection] = useState(false);
  
  // Summary dropdown state
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  
  // Get all selected products from context (includes primary + comparison products)
  const allSelectedProducts = getComparisonProducts();
  
  // Preloading hooks
  const { preloadComparison, preloadCategoryProducts } = usePreloadComparisonData();
  const { isAvailable: comparisonDataAvailable } = useComparisonDataAvailability(allSelectedProducts);
  
  // Fetch products from the same category as the primary product
  const {
    data: categoryProducts = [],
    isLoading: isLoadingCategory,
    error: categoryError
  } = useProductsByCategory(currentSelectedProduct);
  
  // Get date range for primary product to set up default filters (same as SentimentTimeline)
  const {
    data: dateRangeData,
    isLoading: isDateRangeLoading,
    error: dateRangeError
  } = useProductDateRange(currentSelectedProduct);
  
  // Note: Date filters start empty - charts show all available data initially

  // Initialize date filters with dynamic product date range (same as SentimentTimeline)
  useEffect(() => {
    if (dateRangeData && dateRangeData.earliest_date && dateRangeData.latest_date) {
      console.log('Setting dynamic date range:', dateRangeData.earliest_date, 'to', dateRangeData.latest_date);
      if (!startDate && !endDate) { // Only set if not already set by user
        setStartDate(dateRangeData.earliest_date);
        setEndDate(dateRangeData.latest_date);
        setAppliedStartDate(dateRangeData.earliest_date);
        setAppliedEndDate(dateRangeData.latest_date);
      }
    }
  }, [dateRangeData]);

  // Debug logging for comparison selections persistence
  useEffect(() => {
    if (comparisonProduct1 || comparisonProduct2) {
      console.log('Comparison selections restored from persistent state:', {
        primary: currentSelectedProduct,
        comparison1: comparisonProduct1,
        comparison2: comparisonProduct2,
        total: allSelectedProducts.length
      });
    }
  }, [comparisonProduct1, comparisonProduct2, currentSelectedProduct, allSelectedProducts.length]);
  
  // Debug logging for category products
  useEffect(() => {
    if (categoryProducts.length > 0) {
      console.log(`Found ${categoryProducts.length} products in the same category as primary product:`, currentSelectedProduct);
      console.log('Category products:', categoryProducts.map(p => ({
        id: p.parent_asin,
        name: p.product_name,
        sharedCategories: p.shared_categories
      })));
    }
  }, [categoryProducts, currentSelectedProduct]);
  
  // Preload category products when primary product is selected
  useEffect(() => {
    if (currentSelectedProduct) {
      preloadCategoryProducts(currentSelectedProduct);
    }
  }, [currentSelectedProduct, preloadCategoryProducts]);
  
  // Preload comparison data when selections change
  useEffect(() => {
    if (allSelectedProducts.length > 1) {
      preloadComparison(allSelectedProducts);
    }
  }, [allSelectedProducts, preloadComparison]);
  
  // Fetch comparison data for all selected products
  const {
    data: comparisonData = [],
    isLoading: isLoadingComparison,
    error: comparisonError,
    isSuccess: isComparisonSuccess
  } = useMultiProductComparison(allSelectedProducts);

  // Fetch timeline data for all selected products with date filtering (using applied filters)
  const {
    data: timelineData = [],
    isLoading: isLoadingTimeline,
    error: timelineError,
    isSuccess: isTimelineSuccess,
    refetch: refetchTimeline
  } = useMultiProductTimelineComparison(allSelectedProducts, appliedStartDate, appliedEndDate);

  // Fetch yearly timeline data for all selected products (for card view)
  const {
    data: yearlyTimelineData = [],
    isLoading: isLoadingYearlyTimeline,
    error: yearlyTimelineError,
    isSuccess: isYearlyTimelineSuccess
  } = useMultiProductYearlyTimelineComparison(allSelectedProducts);

  // Fetch comprehensive product statistics (all metrics at once)
  const {
    data: comprehensiveStatsData = [],
    isLoading: isLoadingStats,
    error: statsError,
    isSuccess: isStatsSuccess
  } = useComprehensiveProductStats(allSelectedProducts);

  // Fetch sentiment trends data for each product using conditional hooks
  // We need to call hooks for a fixed maximum number of products to comply with Rules of Hooks
  const maxProducts = 3; // Primary + 2 comparison products
  
  const product1Id = allSelectedProducts[0] || null;
  const product2Id = allSelectedProducts[1] || null;
  const product3Id = allSelectedProducts[2] || null;
  
  const trends1 = useSentimentTrends(
    product1Id, 
    appliedStartDate || dateRangeData?.earliest_date, 
    appliedEndDate || dateRangeData?.latest_date
  );
  
  const trends2 = useSentimentTrends(
    product2Id, 
    appliedStartDate || dateRangeData?.earliest_date, 
    appliedEndDate || dateRangeData?.latest_date
  );
  
  const trends3 = useSentimentTrends(
    product3Id, 
    appliedStartDate || dateRangeData?.earliest_date, 
    appliedEndDate || dateRangeData?.latest_date
  );

  // Consolidate trends data
  const sentimentTrendsData = React.useMemo(() => {
    const data = {};
    if (product1Id && trends1.data) data[product1Id] = trends1.data;
    if (product2Id && trends2.data) data[product2Id] = trends2.data;
    if (product3Id && trends3.data) data[product3Id] = trends3.data;
    return data;
  }, [product1Id, trends1, product2Id, trends2, product3Id, trends3]);

  // Check loading states
  const allSentimentTrendsLoaded = React.useMemo(() => {
    const activeQueries = [
      product1Id ? trends1 : null,
      product2Id ? trends2 : null,
      product3Id ? trends3 : null,
    ].filter(Boolean);
    
    return activeQueries.every(query => !query.isLoading);
  }, [product1Id, trends1, product2Id, trends2, product3Id, trends3]);

  const anySentimentTrendsError = React.useMemo(() => {
    const activeQueries = [
      product1Id ? trends1 : null,
      product2Id ? trends2 : null,
      product3Id ? trends3 : null,
    ].filter(Boolean);
    
    return activeQueries.some(query => query.error);
  }, [product1Id, trends1, product2Id, trends2, product3Id, trends3]);

  // Debug logging for timeline data (can be removed in production)
  // useEffect(() => {
  //   console.log('Timeline data changed:', {
  //     timelineData,
  //     appliedStartDate,
  //     appliedEndDate,
  //     allSelectedProducts,
  //     isSuccess: isTimelineSuccess,
  //     isLoading: isLoadingTimeline,
  //     error: timelineError
  //   });
  // }, [timelineData, appliedStartDate, appliedEndDate, allSelectedProducts, isTimelineSuccess, isLoadingTimeline, timelineError]);

  // Show loading indicator with cache awareness
  const isLoadingWithCacheAwareness = isLoadingComparison && !comparisonDataAvailable;
  
  // Check if sentiment trends are loading (same as SentimentTimeline)
  const isSentimentTrendsLoading = !allSentimentTrendsLoaded || isDateRangeLoading;

  const getProductData = (productId) => {
    return comparisonData.find(product => product.parent_asin === productId);
  };

  // Handler for navigating to Product page
  const handleNavigateToProduct = () => {
    navigate('/product');
  };

  // Handler for applying date filters
  const handleApplyFilters = async () => {
    console.log('Applying filters:', { startDate, endDate });
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    
    // Note: useSentimentTrends hooks will automatically refetch when appliedStartDate/appliedEndDate change
    
    // Force a refetch of the fallback timeline data after setting the applied dates
    setTimeout(() => {
      refetchTimeline();
    }, 100);
  };

  // Handler for clearing filters
  const handleClearFilters = () => {
    console.log('Clearing filters');
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    
    // Force a refetch after clearing filters
    setTimeout(() => {
      refetchTimeline();
    }, 100);
  };

  const getProductName = (productId) => {
    if (productId === currentSelectedProduct) {
      return getSelectedProductTitle() || 'Primary Product';
    }
    const product = categoryProducts.find(p => p.parent_asin === productId);
    return product ? product.product_name : productId;
  };

  // The SentimentTimeline API approach is now used via the useSentimentTrends hooks above

  // Consistent color mapping for products across all charts
  const getProductColor = (productIndex) => {
    const colors = [
      'rgba(76, 175, 80, 1)',   // Green for primary product
      'rgba(33, 150, 243, 1)',  // Blue  
      'rgba(156, 39, 176, 1)',  // Purple
      'rgba(255, 152, 0, 1)',   // Orange
      'rgba(244, 67, 54, 1)',   // Red
      'rgba(121, 85, 72, 1)',   // Brown
      'rgba(96, 125, 139, 1)',  // Blue Grey
    ];
    return colors[productIndex % colors.length];
  };

  // Metric configuration for scatter charts (both positive and negative)
  const metricConfig = {
    total_positive: {
      label: 'Total Positive Reviews',
      yAxisLabel: 'Total Number of Positive Reviews',
      description: 'Total count of reviews with 4.0-5.0 star ratings',
      type: 'positive'
    },
    avg_monthly_positive: {
      label: 'Avg Monthly Positive',
      yAxisLabel: 'Average Positive Reviews per Month',
      description: 'Average number of positive reviews per month',
      type: 'positive'
    },
    avg_yearly_positive: {
      label: 'Avg Yearly Positive',
      yAxisLabel: 'Average Positive Reviews per Year',
      description: 'Average number of positive reviews per year',
      type: 'positive'
    },
    median_monthly_positive: {
      label: 'Median Monthly Positive',
      yAxisLabel: 'Median Positive Reviews per Month',
      description: 'Median number of positive reviews per month',
      type: 'positive'
    },
    median_yearly_positive: {
      label: 'Median Yearly Positive',
      yAxisLabel: 'Median Positive Reviews per Year',
      description: 'Median number of positive reviews per year',
      type: 'positive'
    },
    total_negative: {
      label: 'Total Negative Reviews',
      yAxisLabel: 'Total Number of Negative Reviews',
      description: 'Total count of reviews with 1.0-2.9 star ratings',
      type: 'negative'
    },
    avg_monthly_negative: {
      label: 'Avg Monthly Negative',
      yAxisLabel: 'Average Negative Reviews per Month',
      description: 'Average number of negative reviews per month',
      type: 'negative'
    },
    avg_yearly_negative: {
      label: 'Avg Yearly Negative',
      yAxisLabel: 'Average Negative Reviews per Year',
      description: 'Average number of negative reviews per year',
      type: 'negative'
    },
    median_monthly_negative: {
      label: 'Median Monthly Negative',
      yAxisLabel: 'Median Negative Reviews per Month',
      description: 'Median number of negative reviews per month',
      type: 'negative'
    },
    median_yearly_negative: {
      label: 'Median Yearly Negative',
      yAxisLabel: 'Median Negative Reviews per Year',
      description: 'Median number of negative reviews per year',
      type: 'negative'
    }
  };

  // Get current metric configuration
  const currentMetricConfig = metricConfig[selectedMetric] || metricConfig.total_positive;

  // Helper function to extract specific metric data from comprehensive stats
  const getMetricDataForChart = (statsData, metric) => {
    if (!statsData || !Array.isArray(statsData)) return [];
    
    return statsData.map(product => ({
      parent_asin: product.parent_asin,
      product_name: product.product_name,
      total_reviews: product.total_reviews,
      metric_value: product.metrics[metric] || 0,
      metric_type: metric
    }));
  };

  // Get current metric data for the selected metric
  const currentMetricData = getMetricDataForChart(comprehensiveStatsData, selectedMetric);

  // Process timeline data for stacked area charts and timeline comparisons
  const processTimelineData = (timelineData, productId) => {
    if (!timelineData || !Array.isArray(timelineData)) {
      console.log('No timeline data available or not an array');
      return [];
    }

    // Find the product's timeline data
    const productTimelineData = timelineData.find(product => product.parent_asin === productId);
    if (!productTimelineData || !productTimelineData.reviews) {
      console.log(`No timeline data found for product: ${productId}`);
      return [];
    }

    console.log(`Processing timeline data for ${productId}: ${productTimelineData.reviews.length} reviews`);
    
    // Debug: Check first few reviews to see rating data types
    if (productTimelineData.reviews.length > 0) {
      console.log('Sample reviews for debugging:');
      productTimelineData.reviews.slice(0, 5).forEach((review, idx) => {
        console.log(`Review ${idx}: rating=${review.rating} (type: ${typeof review.rating}), timestamp=${review.timestamp}`);
      });
    }

    // Group reviews by month and calculate sentiment percentages
    const monthlyData = {};
    let processedCount = 0;
    
    productTimelineData.reviews.forEach((review, index) => {
      if (!review.timestamp) {
        if (index < 5) console.log(`Review ${index} missing timestamp`);
        return;
      }
      
      try {
        // Process timestamp (same logic as SentimentHexagon)
        let timestampSeconds = parseInt(review.timestamp, 10);
        if (isNaN(timestampSeconds)) {
          if (index < 5) console.log(`Invalid timestamp for review ${index}: ${review.timestamp}`);
          return;
        }
        
        if (timestampSeconds > 1000000000000) {
          timestampSeconds = timestampSeconds / 1000;
        }
        
        const date = new Date(timestampSeconds * 1000);
        if (isNaN(date.getTime())) {
          if (index < 5) console.log(`Invalid date for review ${index}: ${timestampSeconds}`);
          return;
        }
        
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            positive: 0,
            negative: 0,
            neutral: 0,
            total: 0
          };
        }
        
        // NEW FLOAT-BASED CLASSIFICATION RULE: 1.0-2.9 = negative, 3.0-3.9 = neutral, 4.0-5.0 = positive
        // Ensure rating is treated as a number for proper comparison
        const rating = parseFloat(review.rating);
        if (isNaN(rating)) {
          console.warn(`Invalid rating for review ${index}: ${review.rating}`);
          return; // Skip invalid ratings
        }
        
        if (rating >= 4.0) {
          monthlyData[monthKey].positive += 1;
        } else if (rating >= 3.0) {
          monthlyData[monthKey].neutral += 1;
        } else {
          monthlyData[monthKey].negative += 1;
        }
        
        monthlyData[monthKey].total += 1;
        processedCount++;
      } catch (error) {
        if (index < 5) console.log(`Error processing review ${index}:`, error);
      }
    });
    
    console.log(`Processed ${processedCount} reviews into ${Object.keys(monthlyData).length} months`);
    
    // Debug: Show sentiment counts for a few months
    const monthKeys = Object.keys(monthlyData).sort().slice(0, 3);
    monthKeys.forEach(month => {
      const counts = monthlyData[month];
      console.log(`Month ${month}: ${counts.positive} positive, ${counts.neutral} neutral, ${counts.negative} negative (total: ${counts.total})`);
    });
    
    // Convert to array and calculate percentages
    const result = Object.entries(monthlyData)
      .map(([month, counts]) => {
        const positivePercent = counts.total > 0 ? (counts.positive / counts.total) * 100 : 0;
        const negativePercent = counts.total > 0 ? (counts.negative / counts.total) * 100 : 0;
        const neutralPercent = counts.total > 0 ? (counts.neutral / counts.total) * 100 : 0;
        
        return {
          month,
          positive: positivePercent,
          negative: negativePercent,
          neutral: neutralPercent,
          totalReviews: counts.total,
          positiveCount: counts.positive,
          negativeCount: counts.negative,
          neutralCount: counts.neutral
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
      
    console.log(`Final timeline data for ${productId}:`, result.slice(0, 3));
    return result;
  };

  // Create stacked area chart data using SentimentTimeline approach
  const getStackedAreaChartData = (trendsData) => {
    if (!trendsData || !trendsData.timeSeries || trendsData.timeSeries.length === 0) {
      return null;
    }

    const datasets = [
      {
        label: 'Positive',
        data: trendsData.timeSeries.map(item => item.positive),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        fill: true,
        tension: 0.4,
        datalabels: {
          display: false
        }
      },
      {
        label: 'Negative',
        data: trendsData.timeSeries.map(item => item.negative),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        fill: true,
        tension: 0.4,
        datalabels: {
          display: false
        }
      }
    ];

    const chartData = {
      labels: trendsData.timeSeries.map(item => item.month),
      datasets: datasets
    };
    
    // Attach timeSeries data directly to the chart data object for tooltip access (same as SentimentTimeline)
    chartData.processedData = trendsData.timeSeries;
    
    return chartData;
  };

  // Create time series line chart data using SentimentTimeline approach
  const getTimeSeriesChartData = (trendsData) => {
    if (!trendsData || !trendsData.timeSeries || trendsData.timeSeries.length === 0) {
      return null;
    }

    const datasets = [
      {
        label: 'Positive',
        data: trendsData.timeSeries.map(item => item.positive),
        borderColor: 'rgba(76, 175, 80, 1)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBorderWidth: 2,
        pointBackgroundColor: 'rgba(76, 175, 80, 1)',
        pointBorderColor: '#fff',
        datalabels: {
          display: false
        }
      },
      {
        label: 'Neutral',
        data: trendsData.timeSeries.map(item => item.neutral || 0),
        borderColor: 'rgba(156, 163, 175, 1)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBorderWidth: 2,
        pointBackgroundColor: 'rgba(156, 163, 175, 1)',
        pointBorderColor: '#fff',
        datalabels: {
          display: false
        }
      },
      {
        label: 'Negative',
        data: trendsData.timeSeries.map(item => item.negative),
        borderColor: 'rgba(244, 67, 54, 1)',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBorderWidth: 2,
        pointBackgroundColor: 'rgba(244, 67, 54, 1)',
        pointBorderColor: '#fff',
        datalabels: {
          display: false
        }
      }
    ];

    return {
      labels: trendsData.timeSeries.map(item => item.month),
      datasets: datasets,
      processedData: trendsData.timeSeries // Store for tooltip access (same as SentimentTimeline)
    };
  };

  // Create chart data for stacked area chart
  const createStackedAreaChartData = (timelineData, productId) => {
    // Use sentiment trends data from the working API (same as SentimentTimeline)
    const trendsData = sentimentTrendsData[productId];
    if (trendsData) {
      console.log(`Using SentimentTimeline API data for ${productId} area chart`);
      return getStackedAreaChartData(trendsData);
    }
    
    // Fallback to original processing if SentimentTimeline data not available
    console.log(`Falling back to original timeline processing for ${productId} area chart`);
    const processedData = processTimelineData(timelineData, productId);
    
    if (processedData.length === 0) {
      return null;
    }

    const chartData = {
      labels: processedData.map(item => item.month),
      datasets: [
        {
          label: 'Positive',
          data: processedData.map(item => item.positive),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          datalabels: {
            display: false
          }
        },
        {
          label: 'Negative',
          data: processedData.map(item => item.negative),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          fill: true,
          tension: 0.4,
          datalabels: {
            display: false
          }
        }
      ]
    };
    
    // Attach processedData directly to the chart data object for tooltip access
    chartData.processedData = processedData;
    
    return chartData;
  };

  // Create chart data for line chart (similar to SentimentTimeline page)
  const createLineChartData = (timelineData, productId) => {
    // Use sentiment trends data from the working API (same as SentimentTimeline)
    const trendsData = sentimentTrendsData[productId];
    if (trendsData) {
      console.log(`Using SentimentTimeline API data for ${productId} line chart`);
      return getTimeSeriesChartData(trendsData);
    }
    
    // Fallback to original processing if SentimentTimeline data not available
    console.log(`Falling back to original timeline processing for ${productId} line chart`);
    const processedData = processTimelineData(timelineData, productId);
    
    if (processedData.length === 0) {
      return null;
    }

    return {
      labels: processedData.map(item => item.month),
      datasets: [
        {
          label: 'Positive',
          data: processedData.map(item => item.positive),
          borderColor: 'rgba(76, 175, 80, 1)',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
          pointBackgroundColor: 'rgba(76, 175, 80, 1)',
          pointBorderColor: '#fff',
          datalabels: {
            display: false
          }
        },
        {
          label: 'Neutral',
          data: processedData.map(item => item.neutral),
          borderColor: 'rgba(156, 163, 175, 1)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
          pointBackgroundColor: 'rgba(156, 163, 175, 1)',
          pointBorderColor: '#fff',
          datalabels: {
            display: false
          }
        },
        {
          label: 'Negative',
          data: processedData.map(item => item.negative),
          borderColor: 'rgba(244, 67, 54, 1)',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
          pointBackgroundColor: 'rgba(244, 67, 54, 1)',
          pointBorderColor: '#fff',
          datalabels: {
            display: false
          }
        }
      ],
      processedData // Store for tooltip access
    };
  };

  // Create chart data for yearly timeline (for card view)
  const createYearlyLineChartData = (yearlyTimelineData, productId) => {
    if (!yearlyTimelineData || !Array.isArray(yearlyTimelineData)) {
      console.log('No yearly timeline data available or not an array');
      return null;
    }

    // Find the product's yearly timeline data
    const productYearlyData = yearlyTimelineData.find(product => product.parent_asin === productId);
    if (!productYearlyData || !productYearlyData.yearly_data) {
      console.log(`No yearly timeline data found for product: ${productId}`);
      return null;
    }

    const yearlyData = productYearlyData.yearly_data;
    
    if (yearlyData.length === 0) {
      return null;
    }

    return {
      labels: yearlyData.map(item => item.year.toString()),
      datasets: [
        {
          label: 'Positive',
          data: yearlyData.map(item => item.positive),
          borderColor: 'rgba(76, 175, 80, 1)',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBorderWidth: 2,
          pointBackgroundColor: 'rgba(76, 175, 80, 1)',
          pointBorderColor: '#fff',
          datalabels: {
            display: false
          }
        },
        {
          label: 'Neutral',
          data: yearlyData.map(item => item.neutral || 0),
          borderColor: 'rgba(156, 163, 175, 1)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBorderWidth: 2,
          pointBackgroundColor: 'rgba(156, 163, 175, 1)',
          pointBorderColor: '#fff',
          datalabels: {
            display: false
          }
        },
        {
          label: 'Negative',
          data: yearlyData.map(item => item.negative),
          borderColor: 'rgba(244, 67, 54, 1)',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBorderWidth: 2,
          pointBackgroundColor: 'rgba(244, 67, 54, 1)',
          pointBorderColor: '#fff',
          datalabels: {
            display: false
          }
        }
      ],
      yearlyData // Store for tooltip access
    };
  };

  // Chart options for line charts
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          padding: 20,
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => {
              return {
                text: dataset.label,
                fillStyle: dataset.borderColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(i),
                index: i,
                datasetIndex: i
              };
            });
          }
        },
        onClick: function(event, legendItem, legend) {
          const chart = legend.chart;
          const index = legendItem.datasetIndex;
          const meta = chart.getDatasetMeta(index);
          
          if (meta) {
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
            chart.update();
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            try {
              const dataIndex = context.dataIndex;
              const processedData = context.chart.data.processedData;
              
              if (!processedData || !Array.isArray(processedData) || dataIndex >= processedData.length) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
              
              const chartData = processedData[dataIndex];
              if (!chartData) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
              
              const label = context.dataset.label;
              let percentage, count;
              
              if (label === 'Positive') {
                percentage = chartData.positive;
                count = chartData.positiveCount || Math.round((percentage / 100) * chartData.totalReviews);
              } else if (label === 'Neutral') {
                percentage = chartData.neutral;
                count = chartData.neutralCount || Math.round((percentage / 100) * chartData.totalReviews);
              } else if (label === 'Negative') {
                percentage = chartData.negative;
                count = chartData.negativeCount || Math.round((percentage / 100) * chartData.totalReviews);
              }
              
              return `${label}: ${percentage.toFixed(1)}% (${count} reviews)`;
            } catch (error) {
              console.warn('Error in line chart tooltip:', error);
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
            }
          },
          afterLabel: function(context) {
            try {
              if (context.datasetIndex === 0) {
                const dataIndex = context.dataIndex;
                const processedData = context.chart.data.processedData;
                
                if (!processedData || !Array.isArray(processedData) || dataIndex >= processedData.length) {
                  return '';
                }
                
                const chartData = processedData[dataIndex];
                if (!chartData || typeof chartData.totalReviews !== 'number') {
                  return '';
                }
                
                return `Total Reviews: ${chartData.totalReviews}`;
              }
              return '';
            } catch (error) {
              console.warn('Error in line chart tooltip afterLabel:', error);
              return '';
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (Month)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return `${value}%`;
          },
          stepSize: 20
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        borderWidth: 2
      }
    }
  };

  // Chart options for stacked area charts (copied from SentimentTimeline)
  const stackedAreaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      datalabels: {
        display: false // Disable data labels on the chart
      },
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'rect',
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            try {
              const dataIndex = context.dataIndex;
              const processedData = context.chart.data.processedData;
              
              if (!processedData || !Array.isArray(processedData) || dataIndex >= processedData.length) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
              
              const chartData = processedData[dataIndex];
              if (!chartData) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
              
              const label = context.dataset.label;
              const percentage = label === 'Positive' ? chartData.positive : chartData.negative;
              return `${label}: ${percentage.toFixed(1)}%`;
            } catch (error) {
              console.warn('Error in stacked area chart tooltip:', error);
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
            }
          },
          afterLabel: function(context) {
            try {
              if (context.datasetIndex === 0) {
                const dataIndex = context.dataIndex;
                const processedData = context.chart.data.processedData;
                
                if (!processedData || !Array.isArray(processedData) || dataIndex >= processedData.length) {
                  return '';
                }
                
                const chartData = processedData[dataIndex];
                if (!chartData) {
                  return '';
                }
                
                return `Month: ${chartData.month}`;
              }
              return '';
            } catch (error) {
              console.warn('Error in stacked area chart tooltip afterLabel:', error);
              return '';
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (Month)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return `${value}%`;
          },
          stepSize: 25
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.3,
        borderWidth: 1
      },
      point: {
        radius: 0,
        hoverRadius: 5,
        borderWidth: 2
      }
    }
  };

  // Create multi-product monthly positive sentiment comparison chart
  const createMultiProductMonthlyPositiveChart = (timelineData, productIds) => {
    if (!timelineData || !Array.isArray(timelineData) || productIds.length === 0) {
      return null;
    }

    // Get all months from all products to create consistent x-axis
    const allMonths = new Set();
    productIds.forEach(productId => {
      const processedData = processTimelineData(timelineData, productId);
      processedData.forEach(item => allMonths.add(item.month));
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    
    if (sortedMonths.length === 0) {
      return null;
    }

    // Create datasets for each product
    const datasets = productIds.map((productId, index) => {
      const processedData = processTimelineData(timelineData, productId);
      const productName = getProductName(productId);
      
      // Create data array with null values for missing months
      const dataArray = sortedMonths.map(month => {
        const monthData = processedData.find(item => item.month === month);
        return monthData ? monthData.positive : null;
      });

      // Get consistent color for this product
      const color = getProductColor(index);
      
      return {
        label: productName,
        data: dataArray,
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBorderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        datalabels: {
          display: false
        }
      };
    });

    return {
      labels: sortedMonths,
      datasets,
      allMonthsData: productIds.map(productId => ({
        productId,
        data: processTimelineData(timelineData, productId)
      }))
    };
  };

  // Create multi-product monthly negative sentiment comparison chart
  const createMultiProductMonthlyNegativeChart = (timelineData, productIds) => {
    if (!timelineData || !Array.isArray(timelineData) || productIds.length === 0) {
      return null;
    }

    // Get all months from all products to create consistent x-axis
    const allMonths = new Set();
    productIds.forEach(productId => {
      const processedData = processTimelineData(timelineData, productId);
      processedData.forEach(item => allMonths.add(item.month));
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    
    if (sortedMonths.length === 0) {
      return null;
    }

    // Create datasets for each product
    const datasets = productIds.map((productId, index) => {
      const processedData = processTimelineData(timelineData, productId);
      const productName = getProductName(productId);
      
      // Create data array with null values for missing months
      const dataArray = sortedMonths.map(month => {
        const monthData = processedData.find(item => item.month === month);
        return monthData ? monthData.negative : null;
      });

      // Get consistent color for this product (same as positive chart)
      const color = getProductColor(index);
      
      return {
        label: productName,
        data: dataArray,
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBorderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        datalabels: {
          display: false
        }
      };
    });

    return {
      labels: sortedMonths,
      datasets,
      allMonthsData: productIds.map(productId => ({
        productId,
        data: processTimelineData(timelineData, productId)
      }))
    };
  };

  // Create multi-product monthly neutral sentiment comparison chart
  const createMultiProductMonthlyNeutralChart = (timelineData, productIds) => {
    if (!timelineData || !Array.isArray(timelineData) || productIds.length === 0) {
      return null;
    }

    // Get all months from all products to create consistent x-axis
    const allMonths = new Set();
    productIds.forEach(productId => {
      const processedData = processTimelineData(timelineData, productId);
      processedData.forEach(item => allMonths.add(item.month));
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    
    if (sortedMonths.length === 0) {
      return null;
    }

    // Create datasets for each product
    const datasets = productIds.map((productId, index) => {
      const processedData = processTimelineData(timelineData, productId);
      const productName = getProductName(productId);
      
      // Create data array with null values for missing months
      const dataArray = sortedMonths.map(month => {
        const monthData = processedData.find(item => item.month === month);
        return monthData ? monthData.neutral : null;
      });

      // Get consistent color for this product (same as positive/negative charts)
      const color = getProductColor(index);
      
      return {
        label: productName,
        data: dataArray,
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBorderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        datalabels: {
          display: false
        }
      };
    });

    return {
      labels: sortedMonths,
      datasets,
      allMonthsData: productIds.map(productId => ({
        productId,
        data: processTimelineData(timelineData, productId)
      }))
    };
  };

  // Chart options for yearly timeline cards (compact version)
  const yearlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          padding: 10,
          font: {
            size: 10
          },
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => {
              return {
                text: dataset.label,
                fillStyle: dataset.borderColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(i),
                index: i,
                datasetIndex: i
              };
            });
          }
        },
        onClick: function(event, legendItem, legend) {
          const chart = legend.chart;
          const index = legendItem.datasetIndex;
          const meta = chart.getDatasetMeta(index);
          
          if (meta) {
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
            chart.update();
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            try {
              const dataIndex = context.dataIndex;
              const yearlyData = context.chart.data.yearlyData;
              
              if (!yearlyData || !Array.isArray(yearlyData) || dataIndex >= yearlyData.length) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
              
              const chartData = yearlyData[dataIndex];
              if (!chartData) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
              
              const label = context.dataset.label;
              let percentage, count;
              
              if (label === 'Positive') {
                percentage = chartData.positive;
                count = chartData.positive_count;
              } else if (label === 'Neutral') {
                percentage = chartData.neutral || 0;
                count = chartData.neutral_count || 0;
              } else if (label === 'Negative') {
                percentage = chartData.negative;
                count = chartData.negative_count;
              }
              
              return `${label}: ${percentage.toFixed(1)}% (${count} reviews)`;
            } catch (error) {
              console.warn('Error in yearly chart tooltip:', error);
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
            }
          },
          afterLabel: function(context) {
            try {
              if (context.datasetIndex === 0) {
                const dataIndex = context.dataIndex;
                const yearlyData = context.chart.data.yearlyData;
                
                if (!yearlyData || !Array.isArray(yearlyData) || dataIndex >= yearlyData.length) {
                  return '';
                }
                
                const chartData = yearlyData[dataIndex];
                if (!chartData || typeof chartData.total_reviews !== 'number') {
                  return '';
                }
                
                return `Total Reviews: ${chartData.total_reviews}`;
              }
              return '';
            } catch (error) {
              console.warn('Error in yearly chart tooltip afterLabel:', error);
              return '';
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Year',
          font: {
            size: 10,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 9
          }
        }
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: '%',
          font: {
            size: 10,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return `${value}%`;
          },
          stepSize: 25,
          font: {
            size: 9
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 0,
        hoverRadius: 5,
        borderWidth: 2
      }
    }
  };

  // Create scatter plot data for products with selected metric
  const createDynamicScatterPlotData = (statsData, productIds) => {
    if (!statsData || !Array.isArray(statsData) || productIds.length === 0) {
      return null;
    }

    const scatterData = productIds.map((productId, index) => {
      const productStats = statsData.find(product => product.parent_asin === productId);
      
      if (!productStats) return null;
      
      const color = getProductColor(index).replace('1)', '0.8)');
      const borderColor = getProductColor(index);
      
      return {
        label: getProductName(productId),
        data: [{
          x: productStats.total_reviews,
          y: productStats.metric_value,
          productId: productId,
          totalReviews: productStats.total_reviews,
          metricValue: productStats.metric_value,
          metricType: productStats.metric_type,
          productName: productStats.product_name
        }],
        backgroundColor: color,
        borderColor: borderColor,
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 12,
        showLine: false
      };
    }).filter(Boolean);

    return {
      datasets: scatterData
    };
  };

  // Chart options for dynamic scatter plot
  const getDynamicScatterPlotOptions = (yAxisLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'point',
      intersect: true,
    },
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12
          },
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => {
              return {
                text: dataset.label,
                fillStyle: dataset.borderColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(i),
                index: i,
                datasetIndex: i
              };
            });
          }
        },
        onClick: function(event, legendItem, legend) {
          const chart = legend.chart;
          const index = legendItem.datasetIndex;
          const meta = chart.getDatasetMeta(index);
          
          if (meta) {
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
            chart.update();
          }
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const dataPoint = context[0].raw;
            return dataPoint.productName || getProductName(dataPoint.productId);
          },
          label: function(context) {
            const dataPoint = context.raw;
            const metricLabel = currentMetricConfig.label;
            return [
              `Total Reviews: ${dataPoint.totalReviews.toLocaleString()}`,
              `${metricLabel}: ${dataPoint.metricValue.toLocaleString()}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Total Number of Reviews',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: yAxisLabel,
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      }
    },
    elements: {
      point: {
        radius: 8,
        hoverRadius: 12,
        borderWidth: 2
      }
    }
  });

  // Chart options for multi-product comparison charts
  const multiProductComparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          padding: 15,
          font: {
            size: 12
          },
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => {
              return {
                text: dataset.label,
                fillStyle: dataset.borderColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(i),
                index: i,
                datasetIndex: i
              };
            });
          }
        },
        onClick: function(event, legendItem, legend) {
          const chart = legend.chart;
          const index = legendItem.datasetIndex;
          const meta = chart.getDatasetMeta(index);
          
          if (meta) {
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
            chart.update();
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            if (value === null || value === undefined) {
              return `${context.dataset.label}: No data`;
            }
            return `${context.dataset.label}: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time Period',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return `${value}%`;
          },
          stepSize: 20
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        borderWidth: 2
      }
    }
  };

  // Helper function to generate dynamic comparison insights
  const generateComparisonInsights = () => {
    // Only generate insights if we have comparison data and multiple products
    if (!isComparisonSuccess || !comparisonData || comparisonData.length <= 1 || allSelectedProducts.length <= 1) {
      return null;
    }

    try {
      const insights = {
        sentimentDistributionInsight: '',
        performanceComparisonInsight: '',
        timelineInsight: '',
        recommendationInsight: '',
        summary: {
          totalProducts: allSelectedProducts.length,
          bestPerformer: null,
          worstPerformer: null,
          averagePositive: 0,
          averageNegative: 0,
          totalReviewsAcrossProducts: 0
        }
      };

      // Calculate summary statistics
      let totalPositive = 0;
      let totalNegative = 0;
      let totalReviews = 0;
      let bestProduct = null;
      let worstProduct = null;
      let highestPositive = -1;
      let lowestPositive = 101;

      comparisonData.forEach(product => {
        const positivePercent = product.summary_distribution.positive;
        const negativePercent = product.summary_distribution.negative || (100 - positivePercent - (product.summary_distribution.neutral || 0));
        
        totalPositive += positivePercent;
        totalNegative += negativePercent;
        totalReviews += product.total_reviews;

        if (positivePercent > highestPositive) {
          highestPositive = positivePercent;
          bestProduct = product;
        }
        if (positivePercent < lowestPositive) {
          lowestPositive = positivePercent;
          worstProduct = product;
        }
      });

      insights.summary.averagePositive = (totalPositive / comparisonData.length).toFixed(1);
      insights.summary.averageNegative = (totalNegative / comparisonData.length).toFixed(1);
      insights.summary.totalReviewsAcrossProducts = totalReviews;
      insights.summary.bestPerformer = bestProduct;
      insights.summary.worstPerformer = worstProduct;

      // Generate sentiment distribution insight
      const sentimentRange = highestPositive - lowestPositive;
      insights.sentimentDistributionInsight = `Analysis across ${comparisonData.length} products reveals significant sentiment variation. `;
      
      if (sentimentRange < 10) {
        insights.sentimentDistributionInsight += `All products show similar sentiment patterns with positive sentiment ranging from ${lowestPositive.toFixed(1)}% to ${highestPositive.toFixed(1)}%, indicating consistent performance across the product category. `;
      } else if (sentimentRange > 30) {
        insights.sentimentDistributionInsight += `Wide sentiment disparity detected with a ${sentimentRange.toFixed(1)} percentage point gap between best (${highestPositive.toFixed(1)}%) and worst (${lowestPositive.toFixed(1)}%) performers, suggesting significant quality differences. `;
      } else {
        insights.sentimentDistributionInsight += `Moderate sentiment variation observed with positive sentiment ranging from ${lowestPositive.toFixed(1)}% to ${highestPositive.toFixed(1)}%, showing typical market competition patterns. `;
      }

      const avgPositive = parseFloat(insights.summary.averagePositive);
      if (avgPositive > 70) {
        insights.sentimentDistributionInsight += `The category demonstrates strong customer satisfaction with an average positive sentiment of ${insights.summary.averagePositive}%.`;
      } else if (avgPositive < 50) {
        insights.sentimentDistributionInsight += `Category-wide sentiment concerns identified with average positive sentiment at ${insights.summary.averagePositive}%, indicating potential market opportunities.`;
      } else {
        insights.sentimentDistributionInsight += `Mixed category performance with ${insights.summary.averagePositive}% average positive sentiment suggests room for improvement and competitive differentiation.`;
      }

      // Generate performance comparison insight
      if (bestProduct && worstProduct && bestProduct.parent_asin !== worstProduct.parent_asin) {
        const bestProductName = getProductName(bestProduct.parent_asin);
        const worstProductName = getProductName(worstProduct.parent_asin);
        const performanceGap = highestPositive - lowestPositive;
        
        insights.performanceComparisonInsight = `Performance analysis reveals ${bestProductName} as the category leader with ${highestPositive.toFixed(1)}% positive sentiment (${bestProduct.total_reviews.toLocaleString()} reviews), `;
        insights.performanceComparisonInsight += `while ${worstProductName} shows the lowest positive sentiment at ${lowestPositive.toFixed(1)}% (${worstProduct.total_reviews.toLocaleString()} reviews). `;
        
        if (performanceGap > 25) {
          insights.performanceComparisonInsight += `The substantial ${performanceGap.toFixed(1)} percentage point gap indicates significant quality or value proposition differences that customers clearly recognize.`;
        } else if (performanceGap > 15) {
          insights.performanceComparisonInsight += `A notable ${performanceGap.toFixed(1)} percentage point difference suggests meaningful competitive advantages for the leading product.`;
        } else {
          insights.performanceComparisonInsight += `The ${performanceGap.toFixed(1)} percentage point difference indicates competitive market positioning with incremental advantages.`;
        }
      }

      // Generate timeline insight if timeline data is available
      if (isTimelineSuccess && timelineData && timelineData.length > 0) {
        const timelineSummary = timelineData.map(productTimeline => {
          if (!productTimeline.reviews || productTimeline.reviews.length === 0) return null;
          
          // Calculate trend from first to last data point
          const monthlyData = {};
          productTimeline.reviews.forEach(review => {
            if (!review.timestamp) return;
            
            let timestampSeconds = parseInt(review.timestamp, 10);
            if (isNaN(timestampSeconds)) return;
            
            if (timestampSeconds > 1000000000000) {
              timestampSeconds = timestampSeconds / 1000;
            }
            
            const date = new Date(timestampSeconds * 1000);
            if (isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { positive: 0, total: 0 };
            }
            
            if (review.rating >= 4.0) {
              monthlyData[monthKey].positive += 1;
            }
            monthlyData[monthKey].total += 1;
          });
          
          const months = Object.keys(monthlyData).sort();
          if (months.length < 2) return null;
          
          const firstMonth = monthlyData[months[0]];
          const lastMonth = monthlyData[months[months.length - 1]];
          const firstPercent = (firstMonth.positive / firstMonth.total) * 100;
          const lastPercent = (lastMonth.positive / lastMonth.total) * 100;
          const trend = lastPercent - firstPercent;
          
          return {
            productId: productTimeline.parent_asin,
            trend,
            firstPercent,
            lastPercent,
            totalMonths: months.length
          };
        }).filter(Boolean);

        if (timelineSummary.length > 0) {
          const improvingProducts = timelineSummary.filter(p => p.trend > 5).length;
          const decliningProducts = timelineSummary.filter(p => p.trend < -5).length;
          const stableProducts = timelineSummary.length - improvingProducts - decliningProducts;
          
          insights.timelineInsight = `Temporal analysis across the selected time period shows `;
          if (improvingProducts > decliningProducts) {
            insights.timelineInsight += `positive momentum with ${improvingProducts} product${improvingProducts > 1 ? 's' : ''} showing improvement trends. `;
          } else if (decliningProducts > improvingProducts) {
            insights.timelineInsight += `concerning patterns with ${decliningProducts} product${decliningProducts > 1 ? 's' : ''} experiencing declining sentiment. `;
          } else {
            insights.timelineInsight += `mixed temporal patterns with ${stableProducts} product${stableProducts > 1 ? 's' : ''} maintaining stable sentiment levels. `;
          }
          
          insights.timelineInsight += `This suggests ${improvingProducts > 0 ? 'opportunities for learning from improving products and' : ''} the importance of continuous monitoring for competitive positioning.`;
        }
      }

      // Generate recommendation insight
      if (avgPositive > 75) {
        insights.recommendationInsight = `Strong category performance suggests focusing on maintaining quality leadership and leveraging positive sentiment for market expansion. Monitor competitive movements and customer expectations to sustain advantage.`;
      } else if (avgPositive > 60) {
        insights.recommendationInsight = `Solid category foundation with opportunities for differentiation. Focus on identifying and addressing specific pain points highlighted by negative sentiment to gain competitive edge.`;
      } else if (avgPositive > 45) {
        insights.recommendationInsight = `Mixed category performance indicates significant improvement opportunities. Analyze successful products' strategies and address common customer concerns to enhance market position.`;
      } else {
        insights.recommendationInsight = `Category-wide challenges present substantial improvement opportunities. Focus on fundamental quality enhancements and customer experience optimization to achieve competitive differentiation.`;
      }

      return insights;
    } catch (error) {
      console.warn('Error generating comparison insights:', error);
      return null;
    }
  };

  // Sort comparison data to ensure primary product comes first
  const sortedProducts = [...allSelectedProducts].sort((a, b) => {
    if (a === currentSelectedProduct) return -1;
    if (b === currentSelectedProduct) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-black">Product Sentiment Comparison</h1>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors outline-none"
              aria-label="Information about Product Sentiment Comparison"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-gray-100 border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                <div className="text-sm text-gray-700 leading-relaxed">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">About Product Sentiment Comparison</h3>
                  <p className="text-base mb-3">
                    Compare customer sentiment patterns across multiple products from the same category. This page provides:
                  </p>
                  <ul className="list-disc pl-5 mb-3 text-base space-y-1">
                    <li><strong>Sentiment Distribution:</strong> Visual comparison of positive, neutral, and negative review percentages</li>
                    <li><strong>Timeline Analysis:</strong> Track sentiment trends over time with customizable date filters</li>
                    <li><strong>Individual Product Views:</strong> Detailed analysis cards for each selected product</li>
                    <li><strong>Dynamic Scatter Plots:</strong> Relationship analysis between review volume and sentiment metrics</li>
                    <li><strong>Stacked Area Charts:</strong> Temporal sentiment coverage visualization</li>
                  </ul>
                  <p className="text-base font-medium text-blue-700">
                    <strong>Important:</strong> You must select additional products from the same category to enable meaningful comparison analysis.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-100 border-2 border-gray-300 border-r-0 border-b-0 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
        <p className="text-lg text-black">Compare sentiment across different products from the same category</p>
      </div>

      {/* Dynamic Comparison Insights Summary */}
      {hasSelection && (() => {
        const hasMultipleProducts = allSelectedProducts.length > 1;
        const insights = hasMultipleProducts ? generateComparisonInsights() : null;
        const allDataLoaded = !isLoadingComparison && !isLoadingTimeline && !isLoadingStats;
        
        return (
          <div className="bg-gray-100 border-2 border-gray-200 rounded-lg shadow-sm">
            <div className="p-4">
              <button
                onClick={() => {
                  if (hasMultipleProducts && allDataLoaded) {
                    setSummaryExpanded(!summaryExpanded);
                  }
                }}
                onMouseEnter={(e) => {
                  if (hasMultipleProducts && allDataLoaded) {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#dbeafe';
                }}
                className={`w-full flex justify-between items-center p-3 rounded-lg transition-colors outline-none ${
                  hasMultipleProducts && allDataLoaded
                    ? 'bg-blue-100 hover:bg-gray-200 cursor-pointer'
                    : 'bg-gray-200 cursor-not-allowed opacity-75'
                }`}
                disabled={!hasMultipleProducts || !allDataLoaded}
                title={
                  !hasMultipleProducts 
                    ? "Select additional products to enable comparison insights"
                    : !allDataLoaded
                    ? "Loading comparison data..."
                    : "Click to view detailed comparison analysis"
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-blue-900">
                      {!hasMultipleProducts 
                        ? "Comparison Analysis Insights (Requires Additional Products)"
                        : !allDataLoaded
                        ? "Generating Comparison Analysis..."
                        : `Click to ${summaryExpanded ? 'hide' : 'view'} detailed comparison insights`
                      }
                    </h4>
                    <p className="text-xs text-blue-700 mt-1">
                      {!hasMultipleProducts 
                        ? "Select additional products above to enable comprehensive analysis"
                        : !allDataLoaded
                        ? "Loading data from multiple endpoints..."
                        : "Performance comparison and sentiment analysis across selected products"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {(isLoadingComparison || isLoadingTimeline || isLoadingStats) ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg 
                      className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${
                        summaryExpanded ? 'rotate-180' : ''
                      } ${!hasMultipleProducts || !allDataLoaded ? 'opacity-50' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Expandable Content */}
              {summaryExpanded && hasMultipleProducts && allDataLoaded && insights && (
                <div className="border-t border-gray-200 mt-4 pt-4 bg-gray-50 rounded-lg">
                  <div className="space-y-6">
                    {/* Sentiment Distribution Analysis */}
                    <div style={styles.insightSection}>
                      <div style={styles.insightHeader}>
                        <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                        <h5 style={styles.insightTitle}>Sentiment Distribution Analysis</h5>
                      </div>
                      <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                        <ul style={styles.insightList}>
                          <li style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insights.sentimentDistributionInsight}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Performance Comparison Analysis */}
                    {insights.performanceComparisonInsight && (
                      <div style={styles.insightSection}>
                        <div style={styles.insightHeader}>
                          <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                          <h5 style={styles.insightTitle}>Performance Comparison Analysis</h5>
                        </div>
                        <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                          <ul style={styles.insightList}>
                            <li style={styles.insightListItem}>
                              <span style={styles.insightBullet}>•</span>
                              <span style={styles.insightText}>{insights.performanceComparisonInsight}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Timeline Analysis */}
                    {insights.timelineInsight && (
                      <div style={styles.insightSection}>
                        <div style={styles.insightHeader}>
                          <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                          <h5 style={styles.insightTitle}>Timeline Trend Analysis</h5>
                        </div>
                        <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                          <ul style={styles.insightList}>
                            <li style={styles.insightListItem}>
                              <span style={styles.insightBullet}>•</span>
                              <span style={styles.insightText}>{insights.timelineInsight}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div style={styles.insightSection}>
                      <div style={styles.insightHeader}>
                        <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                        <h5 style={styles.insightTitle}>Strategic Recommendations</h5>
                      </div>
                      <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                        <ul style={styles.insightList}>
                          <li style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insights.recommendationInsight}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Primary Product Selection Status - HIDDEN FOR PRODUCTION */}
      {/* 
      {hasSelection ? (
        <Card>
          <div className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 rounded-lg p-3">
                <span className="font-medium text-blue-900">Category:</span>
                <div className="text-blue-700">{selectedCategory}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <span className="font-medium text-blue-900">Primary Product:</span>
                <div className="text-blue-700">{getSelectedProductTitle()}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <span className="font-medium text-blue-900">Product ID:</span>
                <div className="text-blue-700">{selectedProduct}</div>
              </div>
            </div>
            
            {(comparisonProduct1 || comparisonProduct2) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center text-green-800">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">
                    Comparison selections saved - {allSelectedProducts.length} products selected
                  </span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Your selections will persist when navigating between pages
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-black mb-2">No product selected</h3>
            <p className="text-black">
              Go to the <strong>Product</strong> page to select a product for comparison analysis.
            </p>
          </div>
        </Card>
      )}
      */}

      {/* Show message when no product is selected */}
      {!hasSelection && (
        <Card>
          <div 
            className="text-center py-8 cursor-pointer hover:bg-gray-200 transition-colors rounded-lg p-2" 
            onClick={handleNavigateToProduct}
          >
            <h3 className="text-lg font-semibold text-black mb-2">No product selected</h3>
            <p className="text-black">
              Go to the <strong>Product</strong> page to select a product for comparison analysis.
            </p>
          </div>
        </Card>
      )}

      {/* Comparison Selection Interface */}
      {hasSelection && (
        <div className="bg-gray-100 border-2 border-gray-200 rounded-lg shadow-sm">
          <button 
            className="w-full flex justify-between items-center p-4 hover:bg-gray-200 transition-colors rounded-lg"
            onClick={() => setShowProductSelection(!showProductSelection)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-black">Select Products to Compare</span>
              {(comparisonProduct1 || comparisonProduct2) && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  {allSelectedProducts.length} products selected
                </span>
              )}
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${showProductSelection ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showProductSelection && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose up to 2 additional products from the same category to compare with your primary product.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ComparisonDropdown
                  label="Comparison Product 1"
                  selectedProductId={comparisonProduct1}
                  onSelectionChange={updateComparisonProduct1}
                  availableProducts={categoryProducts}
                  isLoading={isLoadingCategory}
                  placeholder="Select first comparison product"
                />
                
                <ComparisonDropdown
                  label="Comparison Product 2"
                  selectedProductId={comparisonProduct2}
                  onSelectionChange={updateComparisonProduct2}
                  availableProducts={categoryProducts}
                  isLoading={isLoadingCategory}
                  placeholder="Select second comparison product"
                />
              </div>
              
              {categoryError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  <strong>Error:</strong> Failed to load comparable products. Please try again.
                </div>
              )}
              
              {!isLoadingCategory && categoryProducts.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
                  <p className="font-medium">No comparable products found</p>
                  <p className="text-sm mt-1">
                    There are no other products in the same category as your selected product.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabbed Comparison Results */}
      {hasSelection && allSelectedProducts.length > 0 && (
        <Card title="Product Analysis" subtitle="Compare products through different views">
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('sentiment')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'sentiment'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Sentiment Distribution
                </button>
                <button
                  onClick={() => setActiveTab('area')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'area'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Sentiment Area
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'timeline'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Sentiment Timeline
                </button>
                <button
                  onClick={() => setActiveTab('single')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'single'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Single Product View
                </button>
                <button
                  onClick={() => setActiveTab('scatter')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'scatter'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dynamic Scatter
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'sentiment' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black">
                  Sentiment Distribution Comparison
                </h3>
                <p className="text-sm text-black">
                  Compare review sentiment across all selected products
                </p>
                
                {/* Loading state for sentiment distribution view */}
                {isLoadingWithCacheAwareness && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-black">Loading comparison data...</p>
                    </div>
                  </div>
                )}
                
                {/* Sentiment Distribution Chart */}
                {isComparisonSuccess && comparisonData.length > 0 && (
                  <div className="max-w-4xl mx-auto">
                    {/* Stacked Bar Chart - Positive vs Negative Reviews */}
                    <div className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                      <div className="space-y-4">
                        {sortedProducts.map((productId) => {
                          const productData = getProductData(productId);
                          if (!productData) return null;
                          
                          // Use actual counts if available from backend, otherwise calculate from percentages
                          const positiveReviews = productData.actual_positive_count || Math.round((productData.total_reviews * productData.summary_distribution.positive) / 100);
                          const neutralReviews = productData.actual_neutral_count || Math.round((productData.total_reviews * (productData.summary_distribution.neutral || 0)) / 100);
                          const negativeReviews = productData.actual_negative_count || Math.round((productData.total_reviews * (productData.summary_distribution.negative || 0)) / 100);
                          const maxReviews = Math.max(...comparisonData.map(p => p.total_reviews));
                          
                          const positivePercent = productData.summary_distribution.positive;
                          const neutralPercent = productData.summary_distribution.neutral || 0;
                          const negativePercent = productData.summary_distribution.negative || (100 - positivePercent - neutralPercent);
                          
                          return (
                            <div key={productId} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 truncate max-w-48" title={getProductName(productId)}>
                                  {getProductName(productId)}
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
                )}
                
                {/* Error state */}
                {comparisonError && (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 font-medium">Error loading comparison data</p>
                    <p className="text-black text-sm mt-1">{comparisonError.message}</p>
                  </div>
                )}
                
                {/* No data state */}
                {isComparisonSuccess && comparisonData.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-black">No comparison data available for the selected products.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'area' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black">
                  Sentiment Timeline Analysis
                </h3>
                <p className="text-sm text-black">
                  Stacked area charts showing sentiment proportions over time for each selected product. {appliedStartDate || appliedEndDate ? 'Filtering applied based on available data for each product.' : 'Currently showing all available temporal data for each product.'}
                </p>
                
                {/* Applied Filter Indicator */}
                {(appliedStartDate || appliedEndDate) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center text-blue-800">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        Active Filter: {appliedStartDate || 'Any start'} to {appliedEndDate || 'Any end'}
                      </span>
                    </div>
                  </div>
                )}
                 
                {/* Date Filter Controls */}
                <div className="bg-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1 min-w-[150px]">
                      <label className="text-sm font-medium text-gray-700">Start Date:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        max={endDate}
                        placeholder="Select start date to filter"
                      />
                      <span className="text-xs text-gray-500">Leave empty to show all data</span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-[150px]">
                      <label className="text-sm font-medium text-gray-700">End Date:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        min={startDate}
                        placeholder="Select end date to filter"
                      />
                      <span className="text-xs text-gray-500">Leave empty to show all data</span>
                    </div>
                    <button
                      onClick={handleApplyFilters}
                      disabled={isLoadingTimeline || (!startDate && !endDate)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
                      title={(!startDate && !endDate) ? "Select at least one date to apply filtering" : "Apply date filter to charts"}
                    >
                      {isLoadingTimeline ? 'Loading...' : (startDate || endDate) ? 'Apply Filter' : 'Select Dates'}
                    </button>
                    {(appliedStartDate || appliedEndDate) && (
                      <button
                        onClick={handleClearFilters}
                        disabled={isLoadingTimeline}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px]"
                        title="Clear date filters and show all available data"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Loading state for timeline view */}
                {(isLoadingTimeline || isLoadingYearlyTimeline || isSentimentTrendsLoading) && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-black">
                        {isSentimentTrendsLoading ? 'Loading sentiment timeline data...' : 'Loading timeline data...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Error state */}
                {(timelineError || yearlyTimelineError) && (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 font-medium">Error loading timeline data</p>
                    <p className="text-black text-sm mt-1">{(timelineError || yearlyTimelineError)?.message}</p>
                  </div>
                )}
                
                {/* Timeline Charts */}
                {isTimelineSuccess && timelineData.length > 0 && (
                  <div className="space-y-6">
                    {sortedProducts.map((productId) => {
                      const chartData = createStackedAreaChartData(timelineData, productId);
                      
                      if (!chartData) {
                        return (
                          <div key={productId} className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-black mb-4">
                              {getProductName(productId)}
                            </h4>
                            <div className="text-center py-8">
                              <p className="text-gray-500">No timeline data available for this product</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={productId} className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                          <h4 className="text-lg font-semibold text-black mb-4">
                            {getProductName(productId)}
                            {productId === currentSelectedProduct && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Primary
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-black mb-4">
                            Shows positive/negative proportions over time
                          </p>
                          
                          <div className="h-80">
                            <Line 
                              key={`timeline-chart-${productId}-${appliedStartDate}-${appliedEndDate}`}
                              data={chartData} 
                              options={stackedAreaChartOptions}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* No data state */}
                {isTimelineSuccess && timelineData.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-black">No timeline data available for the selected products.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black">
                  Sentiment Timeline Comparison
                </h3>
                <p className="text-sm text-black">
                  Line charts showing positive and negative sentiment percentages over time for each product. {appliedStartDate || appliedEndDate ? 'Filtering applied based on available data for each product.' : 'Currently showing all available temporal data for each product.'}
                </p>
                
                {/* Applied Filter Indicator */}
                {(appliedStartDate || appliedEndDate) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center text-blue-800">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        Active Filter: {appliedStartDate || 'Any start'} to {appliedEndDate || 'Any end'}
                      </span>
                    </div>
                  </div>
                )}
                 
                {/* Date Filter Controls */}
                <div className="bg-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1 min-w-[150px]">
                      <label className="text-sm font-medium text-gray-700">Start Date:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        max={endDate}
                        placeholder="Select start date to filter"
                      />
                      <span className="text-xs text-gray-500">Leave empty to show all data</span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-[150px]">
                      <label className="text-sm font-medium text-gray-700">End Date:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        min={startDate}
                        placeholder="Select end date to filter"
                      />
                      <span className="text-xs text-gray-500">Leave empty to show all data</span>
                    </div>
                    <button
                      onClick={handleApplyFilters}
                      disabled={isLoadingTimeline || (!startDate && !endDate)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
                      title={(!startDate && !endDate) ? "Select at least one date to apply filtering" : "Apply date filter to charts"}
                    >
                      {isLoadingTimeline ? 'Loading...' : (startDate || endDate) ? 'Apply Filter' : 'Select Dates'}
                    </button>
                    {(appliedStartDate || appliedEndDate) && (
                      <button
                        onClick={handleClearFilters}
                        disabled={isLoadingTimeline}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px]"
                        title="Clear date filters and show all available data"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Comparison Charts */}
                {isTimelineSuccess && timelineData.length > 0 ? (
                  <div className="space-y-8">
                    {/* Multi-Product Monthly Positive Sentiment Comparison */}
                    {isTimelineSuccess && timelineData.length > 0 && allSelectedProducts.length > 1 && (
                      <div className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-black mb-2">
                          Monthly Positive Sentiment Comparison
                        </h4>
                        <p className="text-sm text-black mb-4">
                          Compare positive sentiment percentages across all selected products by month
                        </p>
                        {(() => {
                          const monthlyPositiveChartData = createMultiProductMonthlyPositiveChart(timelineData, allSelectedProducts);
                          
                          if (!monthlyPositiveChartData) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-gray-500">No monthly comparison data available</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="h-80">
                              <Line 
                                key={`monthly-positive-comparison-${appliedStartDate}-${appliedEndDate}`}
                                data={monthlyPositiveChartData} 
                                options={{
                                  ...multiProductComparisonChartOptions,
                                  scales: {
                                    ...multiProductComparisonChartOptions.scales,
                                    x: {
                                      ...multiProductComparisonChartOptions.scales.x,
                                      title: {
                                        ...multiProductComparisonChartOptions.scales.x.title,
                                        text: 'Month'
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Multi-Product Monthly Negative Sentiment Comparison */}
                    {isTimelineSuccess && timelineData.length > 0 && allSelectedProducts.length > 1 && (
                      <div className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-black mb-2">
                          Monthly Negative Sentiment Comparison
                        </h4>
                        <p className="text-sm text-black mb-4">
                          Compare negative sentiment percentages across all selected products by month
                        </p>
                        {(() => {
                          const monthlyNegativeChartData = createMultiProductMonthlyNegativeChart(timelineData, allSelectedProducts);
                          
                          if (!monthlyNegativeChartData) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-gray-500">No monthly comparison data available</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="h-80">
                              <Line 
                                key={`monthly-negative-comparison-${appliedStartDate}-${appliedEndDate}`}
                                data={monthlyNegativeChartData} 
                                options={{
                                  ...multiProductComparisonChartOptions,
                                  scales: {
                                    ...multiProductComparisonChartOptions.scales,
                                    x: {
                                      ...multiProductComparisonChartOptions.scales.x,
                                      title: {
                                        ...multiProductComparisonChartOptions.scales.x.title,
                                        text: 'Month'
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Individual Product Charts Section Header */}
                    {allSelectedProducts.length > 0 && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-lg font-semibold text-black mb-2">
                          Individual Product Timeline Analysis
                        </h4>
                        <p className="text-sm text-black mb-4">
                          Detailed sentiment analysis for each selected product
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Loading state for timeline view */}
                {(isLoadingTimeline || isLoadingYearlyTimeline || isSentimentTrendsLoading) && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-black">
                        {isSentimentTrendsLoading ? 'Loading sentiment timeline data...' : 'Loading timeline data...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Error state */}
                {(timelineError || yearlyTimelineError) && (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 font-medium">Error loading timeline data</p>
                    <p className="text-black text-sm mt-1">{(timelineError || yearlyTimelineError)?.message}</p>
                  </div>
                )}
                
                {/* Timeline Line Charts */}
                {isTimelineSuccess && timelineData.length > 0 && (
                  <div className="space-y-6">
                    {sortedProducts.map((productId) => {
                      const chartData = createLineChartData(timelineData, productId);
                      
                      if (!chartData) {
                        return (
                          <div key={productId} className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-black mb-4">
                              {getProductName(productId)}
                            </h4>
                            <div className="text-center py-8">
                              <p className="text-gray-500">No timeline data available for this product</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={productId} className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                          <h4 className="text-lg font-semibold text-black mb-4">
                            {getProductName(productId)}
                            {productId === currentSelectedProduct && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Primary
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-black mb-4">
                            Line chart showing positive and negative sentiment percentages over time
                          </p>
                          
                          <div className="h-80">
                            <Line 
                              key={`line-chart-${productId}-${appliedStartDate}-${appliedEndDate}`}
                              data={chartData} 
                              options={lineChartOptions}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* No data state */}
                {isTimelineSuccess && timelineData.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-black">No timeline data available for the selected products.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'single' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-black">
                  Individual Product Analysis ({allSelectedProducts.length} {allSelectedProducts.length === 1 ? 'Product' : 'Products'})
                </h3>
                <p className="text-sm text-black">
                  Interactive sentiment analysis comparison for each selected product
                </p>
          {isLoadingWithCacheAwareness && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-black">Loading comparison data...</p>
              </div>
            </div>
          )}
          
          {/* Show cached data indicator */}
          {isLoadingComparison && comparisonDataAvailable && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-blue-800">
                <svg className="w-5 h-5 mr-2 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Refreshing comparison data...</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Showing cached data while updating
              </div>
            </div>
          )}
          
          {comparisonError && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">Error loading comparison data</p>
              <p className="text-black text-sm mt-1">{comparisonError.message}</p>
            </div>
          )}
          
          {isComparisonSuccess && comparisonData.length > 0 && (
            <div className={`grid gap-6 ${
              allSelectedProducts.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
              allSelectedProducts.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
              'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
            }`}>
              {sortedProducts.map((productId, index) => {
                const productData = getProductData(productId);
                const isPrimary = productId === currentSelectedProduct;
                
                if (!productData) {
                  return (
                    <div key={productId} className={`space-y-4 ${isPrimary ? 'p-4 bg-blue-50 border-2 border-blue-500 rounded-lg' : 'p-4 bg-gray-200 border-2 border-gray-200 rounded-lg'}`}>
                      <div className="text-center p-4 rounded-lg border-2 border-gray-200 bg-gray-200 min-h-[100px] flex flex-col justify-center">
                        <div className="flex items-center justify-center mb-2">
                          <h3 
                            className="text-lg font-bold text-black truncate max-w-full px-2 cursor-help"
                            title={getProductName(productId)}
                            style={{ maxWidth: '280px' }}
                          >
                            {getProductName(productId)}
                          </h3>
                        </div>
                        <p className="text-sm text-black">ID: {productId}</p>
                      </div>
                      <Card>
                        <div className="text-center py-8">
                          <p className="text-gray-500">No data available for this product</p>
                        </div>
                      </Card>
                    </div>
                  );
                }
                

                
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
                  <div key={productId} className={`space-y-4 ${isPrimary ? 'p-4 bg-blue-50 border-2 border-blue-500 rounded-lg' : 'p-4 bg-gray-200 border-2 border-gray-200 rounded-lg'}`}>
                    {/* Product Header */}
                    <div className={`text-center p-4 rounded-lg border-2 min-h-[100px] flex flex-col justify-center ${isPrimary ? 'border-gray-200 bg-gray-200' : 'border-gray-200 bg-gray-200'}`}>
                      <div className="flex items-center justify-center mb-2">
                        <h3 
                          className="text-lg font-bold text-black truncate max-w-full px-2 cursor-help"
                          title={getProductName(productId)}
                          style={{ maxWidth: '280px' }}
                        >
                          {getProductName(productId)}
                        </h3>
                      </div>
                      <p className="text-sm text-black">ID: {productId}</p>
                    </div>


                    {/* Sentiment Distribution Pie Chart */}
                    <Card>
                      <div className="bg-gray-200 rounded-lg p-4 text-center">
                        <div className="relative w-32 h-32 mx-auto mb-3">
                          <div className="w-full h-full rounded-full bg-gray-300 relative overflow-hidden">
                            {(() => {
                              const positivePercent = productData.summary_distribution.positive;
                              const neutralPercent = productData.summary_distribution.neutral || 0;
                              const negativePercent = productData.summary_distribution.negative || (100 - positivePercent - neutralPercent);
                              
                              return (
                                <div 
                                  className="absolute inset-0 rounded-full"
                                  style={{
                                    background: `conic-gradient(
                                      #10b981 0% ${positivePercent}%, 
                                      #9ca3af ${positivePercent}% ${positivePercent + neutralPercent}%, 
                                      #ef4444 ${positivePercent + neutralPercent}% 100%
                                    )`
                                  }}
                                ></div>
                              );
                            })()}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-gray-200 rounded-full w-20 h-20 flex items-center justify-center">
                                <span className="text-sm font-bold text-black">{productData.summary_distribution.positive.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-black">
                          Average Sentiment is <span className={`font-semibold ${productData.summary_distribution.positive >= 60 ? 'text-green-600' : productData.summary_distribution.positive >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {productData.summary_distribution.positive >= 60 ? 'positive' : productData.summary_distribution.positive >= 40 ? 'mixed' : 'negative'}
                          </span>
                        </p>
                      </div>
                    </Card>

                    {/* Sentiment Heatmap */}
                    <Card>
                      <div className="bg-gray-200 rounded-lg p-4">
                        <div className="flex justify-center mb-3">
                          <svg width="100%" height="280" viewBox="0 0 400 280" className="w-full h-auto">
                            {/* Enhanced hexagon heatmap for comparison view */}
                            {(() => {
                              const hexagons = [];
                              const hexRadius = 9;
                              const mapColumns = 24;
                              const mapRows = 18;
                              
                              const seed = productData.hexagon_seed || 1000;
                              let randomIndex = 0;
                              const seededRandom = () => {
                                const x = Math.sin(seed + randomIndex++) * 10000;
                                return x - Math.floor(x);
                              };
                              
                              let hexIndex = 0;
                              for (let i = 0; i < mapRows && hexIndex < 600; i++) {
                                for (let j = 0; j < mapColumns && hexIndex < 600; j++) {
                                  let x = hexRadius * j * Math.sqrt(3);
                                  
                                  if (i % 2 === 1) {
                                    x += (hexRadius * Math.sqrt(3)) / 2;
                                  }
                                  
                                  const y = hexRadius * i * 1.5;
                                  
                                  if (x > 390 || y > 270) continue;
                                  
                                  const sentimentType = seededRandom() * 100;
                                  let fillColor;
                                  const positivePercent = productData.summary_distribution.positive;
                                  const neutralPercent = productData.summary_distribution.neutral || 0;
                                  const negativePercent = productData.summary_distribution.negative || (100 - positivePercent - neutralPercent);
                                  
                                  if (sentimentType < positivePercent) {
                                    // Positive sentiment - green shades
                                    fillColor = sentimentType < positivePercent * 0.7 ? '#10b981' : '#6ee7b7';
                                  } else if (sentimentType < positivePercent + neutralPercent) {
                                    // Neutral sentiment - grey shades
                                    fillColor = sentimentType < positivePercent + (neutralPercent * 0.7) ? '#9ca3af' : '#d1d5db';
                                  } else {
                                    // Negative sentiment - red shades
                                    fillColor = sentimentType < positivePercent + neutralPercent + (negativePercent * 0.5) ? '#ef4444' : '#dc2626';
                                  }
                                  
                                  const hexPath = `M${x},${y - hexRadius}L${x + hexRadius * Math.cos(Math.PI/6)},${y - hexRadius/2}L${x + hexRadius * Math.cos(Math.PI/6)},${y + hexRadius/2}L${x},${y + hexRadius}L${x - hexRadius * Math.cos(Math.PI/6)},${y + hexRadius/2}L${x - hexRadius * Math.cos(Math.PI/6)},${y - hexRadius/2}Z`;
                                  
                                  hexagons.push(
                                    <path
                                      key={hexIndex}
                                      d={hexPath}
                                      fill={fillColor}
                                      stroke="white"
                                      strokeWidth="0.8"
                                    />
                                  );
                                  
                                  hexIndex++;
                                }
                              }
                              
                              return hexagons;
                            })()}
                          </svg>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Sentiment patterns from recent reviews
                        </p>
                      </div>
                    </Card>

                    {/* Top Words Analysis */}
                    <Card>
                      <div className="bg-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-black mb-3 text-center text-sm">
                          Top words in reviews
                        </h5>
                        <div className="space-y-1">
                          {productData.top_words.slice(0, 8).map((wordData, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <span className="w-5 text-gray-500 font-medium text-xs">{index + 1}.</span>
                                <span className={`font-medium ${getSentimentColor(wordData.sentiment)}`}>
                                  {wordData.word}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">
                                ({wordData.total_count || 'N/A'})
                              </span>
                            </div>
                          ))}
                          {productData.top_words.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No words data available
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Yearly Sentiment Timeline */}
                    <Card>
                      <div className="bg-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-black mb-3 text-center text-sm">
                          Sentiment trends by year
                        </h5>
                        {(() => {
                          if (isLoadingYearlyTimeline) {
                            return (
                              <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                  <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                                  <p className="text-xs text-black">Loading...</p>
                                </div>
                              </div>
                            );
                          }
                          
                          if (yearlyTimelineError) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-xs text-red-600">Error loading timeline</p>
                              </div>
                            );
                          }
                          
                          const yearlyChartData = createYearlyLineChartData(yearlyTimelineData, productId);
                          
                          if (!yearlyChartData) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-xs text-gray-500">No timeline data available</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="h-48">
                              <Line 
                                key={`yearly-chart-${productId}`}
                                data={yearlyChartData} 
                                options={yearlyChartOptions}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
          
          {isComparisonSuccess && comparisonData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-black">No comparison data available for the selected products.</p>
            </div>
          )}
              </div>
            )}

            {activeTab === 'scatter' && (
              <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-black">
                    Dynamic Scatter Analysis
                  </h3>
                  <p className="text-sm text-black">
                    Dynamic scatter plot showing the relationship between total reviews (X-axis) and selected review metrics (Y-axis) for all selected products. Choose any metric to analyze different aspects of positive or negative sentiment patterns.
                  </p>
                
                {/* Metric Selection Buttons */}
                <div className="bg-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-black mb-3">Select Metric for Analysis</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose any metric to analyze. The scatter chart will dynamically update to show the selected metric.
                  </p>
                  
                  {/* Positive Metrics */}
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-green-700 mb-2">Positive Review Metrics</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                      {Object.entries(metricConfig)
                        .filter(([_, config]) => config.type === 'positive')
                        .map(([metricKey, config]) => (
                        <button
                          key={metricKey}
                          onClick={() => setSelectedMetric(metricKey)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedMetric === metricKey
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-green-50 border border-green-300'
                          }`}
                          title={config.description}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Negative Metrics */}
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-red-700 mb-2">Negative Review Metrics</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                      {Object.entries(metricConfig)
                        .filter(([_, config]) => config.type === 'negative')
                        .map(([metricKey, config]) => (
                        <button
                          key={metricKey}
                          onClick={() => setSelectedMetric(metricKey)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedMetric === metricKey
                              ? 'bg-red-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-red-50 border border-red-300'
                          }`}
                          title={config.description}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* {isStatsSuccess && comprehensiveStatsData.length > 0 && (
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      All metrics loaded - switching is instant!
                    </div>
                  )} */}
                </div>
                
                {/* Loading state for scatter chart */}
                {isLoadingStats && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-black">Loading comprehensive product statistics...</p>
                      <p className="text-sm text-gray-600 mt-1">Calculating all metrics for faster switching</p>
                    </div>
                  </div>
                )}
                
                {/* Dynamic Scatter Plot Chart */}
                {isStatsSuccess && comprehensiveStatsData.length > 0 && (
                  <div className="bg-gray-200 rounded-lg border border-gray-200 p-6">
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-black mb-2">
                        {currentMetricConfig.label} vs Total Reviews
                      </h4>
                      <p className="text-sm text-black">
                        Each point represents a product plotted by total reviews and {currentMetricConfig.label.toLowerCase()}
                      </p>
                    </div>
                    
                    {(() => {
                      const scatterData = createDynamicScatterPlotData(currentMetricData, allSelectedProducts);
                      
                      if (!scatterData) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No scatter plot data available</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="h-96">
                          <Scatter 
                            key={`scatter-chart-${allSelectedProducts.join('-')}-${selectedMetric}`}
                            data={scatterData} 
                            options={getDynamicScatterPlotOptions(currentMetricConfig.yAxisLabel)}
                          />
                        </div>
                      );
                    })()}
                    
                  </div>
                )}

                {/* Product Performance Summary */}
                {isStatsSuccess && comprehensiveStatsData.length > 0 && (
                  <div className="bg-gray-200 rounded-lg border border-gray-200 p-6 mt-6">
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h5 className="font-semibold text-black mb-3">Product Performance Summary - {currentMetricConfig.label}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedProducts.map((productId) => {
                          const productStats = comprehensiveStatsData.find(p => p.parent_asin === productId);
                          if (!productStats) return null;
                          
                          const isPrimary = productId === currentSelectedProduct;
                          const currentMetricValue = productStats.metrics[selectedMetric] || 0;
                          
                          return (
                            <div key={productId} className={`p-3 rounded-lg border-2 ${isPrimary ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="font-medium text-black text-sm truncate" title={getProductName(productId)}>
                                  {getProductName(productId)}
                                </h6>
                                {isPrimary && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1 text-xs text-black">
                                <div className="flex justify-between">
                                  <span>Total Reviews:</span>
                                  <span className="font-medium">{productStats.total_reviews.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{currentMetricConfig.label}:</span>
                                  <span className={`font-medium ${currentMetricConfig.type === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                                    {currentMetricValue.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Error state */}
                {statsError && (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 font-medium">Error loading product statistics</p>
                    <p className="text-black text-sm mt-1">{statsError.message}</p>
                  </div>
                )}
                
                {/* No data state */}
                {isStatsSuccess && comprehensiveStatsData.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-black">No product statistics available for the selected products.</p>
                  </div>
                )}
                
                {/* Single product warning */}
                {allSelectedProducts.length === 1 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center text-yellow-800">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">Single Product Selected</p>
                        <p className="text-sm mt-1">
                          Scatter plots are most effective when comparing multiple products. Select additional products to see comparative analysis with different metrics.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </Card>
      )}


    </div>
  );
};

const styles = {
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

export default ProductComparison; 