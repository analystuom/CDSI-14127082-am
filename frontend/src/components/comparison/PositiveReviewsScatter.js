import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const PositiveReviewsScatter = ({ scatterData, selectedProductIds, isLoading, error }) => {
  // Helper function to get product name
  const getProductName = (productId, scatterData) => {
    const product = scatterData?.find(p => p.parent_asin === productId);
    return product?.product_name || productId;
  };

  // Helper function to truncate product name for legend display
  const getTruncatedProductName = (productId, scatterData) => {
    const fullName = getProductName(productId, scatterData);
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

  // Create scatter plot data for positive reviews vs total reviews
  const createPositiveScatterPlotData = (scatterData, productIds) => {
    if (!scatterData || !Array.isArray(scatterData) || productIds.length === 0) {
      return null;
    }

    const scatterPlotData = productIds.map((productId, index) => {
      const productStats = scatterData.find(product => product.parent_asin === productId);
      
      if (!productStats) return null;
      
      const color = getProductColor(index).replace('1)', '0.8)');
      const borderColor = getProductColor(index);
      
      return {
        label: getTruncatedProductName(productId, scatterData),
        data: [{
          x: productStats.total_reviews,
          y: productStats.total_positive_reviews,
          productId: productId,
          totalReviews: productStats.total_reviews,
          positiveReviews: productStats.total_positive_reviews,
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
      datasets: scatterPlotData
    };
  };

  // Chart options for positive reviews scatter plot
  const getPositiveScatterPlotOptions = () => ({
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
            return dataPoint.productName || getProductName(dataPoint.productId, scatterData);
          },
          label: function(context) {
            const dataPoint = context.raw;
            return [
              `Total Reviews: ${dataPoint.totalReviews.toLocaleString()}`,
              `Positive Reviews: ${dataPoint.positiveReviews.toLocaleString()}`
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
          text: 'Total Number of Positive Reviews',
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

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Positive Reviews vs Total Reviews</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading scatter plot data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Positive Reviews vs Total Reviews</h3>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Error loading scatter plot data</p>
          <p className="text-gray-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!scatterData || scatterData.length === 0) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Positive Reviews vs Total Reviews</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No scatter plot data available for the selected products.</p>
        </div>
      </div>
    );
  }

  // Create chart data
  const positiveScatterData = createPositiveScatterPlotData(scatterData, selectedProductIds);

  if (!positiveScatterData) {
    return (
      <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Positive Reviews vs Total Reviews</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No scatter plot data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Positive Reviews vs Total Reviews</h3>
        <p className="text-sm text-gray-600">
          Each point represents a product plotted by total reviews and total positive reviews
        </p>
      </div>
      
      <div className="h-96">
        <Scatter 
          data={positiveScatterData} 
          options={getPositiveScatterPlotOptions()}
        />
      </div>

      {/* Product Performance Summary */}
      {/* <div className="mt-6 pt-6 border-t border-gray-300">
        <h4 className="font-semibold text-gray-800 mb-3">Product Performance Summary - Positive Reviews</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedProductIds.map((productId, index) => {
            const productStats = scatterData.find(p => p.parent_asin === productId);
            if (!productStats) return null;
            
            const isPrimary = index === 0; // Assume first product is primary
            
            return (
              <div key={productId} className={`p-3 rounded-lg border-2 ${isPrimary ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-800 text-sm truncate" title={getProductName(productId, scatterData)}>
                    {getProductName(productId, scatterData)}
                  </h5>
                  {isPrimary && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  <div className="flex justify-between">
                    <span>Total Reviews:</span>
                    <span className="font-medium">{productStats.total_reviews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Positive Reviews:</span>
                    <span className="font-medium text-green-600">
                      {productStats.total_positive_reviews.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Positive Rate:</span>
                    <span className="font-medium text-green-600">
                      {productStats.total_reviews > 0 ? ((productStats.total_positive_reviews / productStats.total_reviews) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div> */}
    </div>
  );
};

export default PositiveReviewsScatter;
