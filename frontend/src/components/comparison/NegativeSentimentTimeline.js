import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const NegativeSentimentTimeline = ({ timelineData, selectedProductIds, isLoading, error }) => {
  // Helper function to get product name
  const getProductName = (productId, timelineData) => {
    const product = timelineData?.find(p => p.parent_asin === productId);
    return product?.product_name || productId;
  };

  // Helper function to truncate product name for legend display
  const getTruncatedProductName = (productId, timelineData) => {
    const fullName = getProductName(productId, timelineData);
    // Truncate to half the length, with a minimum of 20 characters and maximum of 40
    const targetLength = Math.max(20, Math.min(40, Math.floor(fullName.length / 2)));
    return fullName.length > targetLength ? fullName.substring(0, targetLength) + '...' : fullName;
  };

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

  // Process timeline data for negative sentiment
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
    
    // Group reviews by month and calculate sentiment percentages
    const monthlyData = {};
    let processedCount = 0;
    
    productTimelineData.reviews.forEach((review, index) => {
      if (!review.timestamp) {
        if (index < 5) console.log(`Review ${index} missing timestamp`);
        return;
      }
      
      try {
        // Process timestamp (same logic as ProductComparison)
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
        
        // FLOAT-BASED CLASSIFICATION RULE: 1.0-2.9 = negative, 3.0-3.9 = neutral, 4.0-5.0 = positive
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
    
    // Convert to array and calculate percentages
    const result = Object.entries(monthlyData)
      .map(([month, counts]) => {
        const negativePercent = counts.total > 0 ? (counts.negative / counts.total) * 100 : 0;
        
        return {
          month,
          negative: negativePercent,
          totalReviews: counts.total,
          negativeCount: counts.negative
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
      
    console.log(`Final negative timeline data for ${productId}:`, result.slice(0, 3));
    return result;
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
      const productName = getProductName(productId, timelineData);
      
      // Create data array with null values for missing months
      const dataArray = sortedMonths.map(month => {
        const monthData = processedData.find(item => item.month === month);
        return monthData ? monthData.negative : null;
      });

      // Get consistent color for this product (same as positive chart)
      const color = getProductColor(index);
      
      return {
        label: getTruncatedProductName(productId, timelineData),
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
          text: 'Month',
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
          text: 'Negative Sentiment (%)',
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

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Negative Sentiment Timeline</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading timeline data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Negative Sentiment Timeline</h3>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Error loading timeline data</p>
          <p className="text-gray-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Negative Sentiment Timeline</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No timeline data available for the selected products.</p>
        </div>
      </div>
    );
  }

  // Create chart data
  const monthlyNegativeChartData = createMultiProductMonthlyNegativeChart(timelineData, selectedProductIds);

  if (!monthlyNegativeChartData) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Negative Sentiment Timeline</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No monthly comparison data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Negative Sentiment Timeline</h3>
      <p className="text-sm text-gray-600 mb-4">
        Compare negative sentiment percentages across all selected products by month
      </p>
      <div className="h-80">
        <Line 
          data={monthlyNegativeChartData} 
          options={multiProductComparisonChartOptions}
        />
      </div>
    </div>
  );
};

export default NegativeSentimentTimeline;
