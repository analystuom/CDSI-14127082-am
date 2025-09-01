import React, { useState, useEffect } from 'react';
import { useSentimentDistributions, useProductDateRange } from '../hooks/useNewSentimentQueries';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const DashboardSentimentDistribution = ({ selectedProduct, filters = {} }) => {
  // Date filter states - use filters from parent if available, otherwise use dynamic range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Date range query to get product's earliest and latest dates - fallback for when no filters provided
  const {
    data: dateRangeData,
    isLoading: isDateRangeLoading,
    error: dateRangeError
  } = useProductDateRange(selectedProduct);
  
  // Initialize date filters - prioritize parent filters, fallback to dynamic product date range
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      // Use filters from parent dashboard
      console.log('Using filters from parent dashboard:', filters.startDate, 'to', filters.endDate);
      setStartDate(filters.startDate);
      setEndDate(filters.endDate);
    } else if (dateRangeData && dateRangeData.earliest_date && dateRangeData.latest_date) {
      // Fallback to dynamic product date range
      console.log('Using dynamic date range:', dateRangeData.earliest_date, 'to', dateRangeData.latest_date);
      setStartDate(dateRangeData.earliest_date);
      setEndDate(dateRangeData.latest_date);
    }
  }, [filters.startDate, filters.endDate, dateRangeData]);
  
  // TanStack Query hook for sentiment distributions data - fixed to 'year' view, now includes city filters
  const {
    data: distributionsData,
    isLoading: isDistributionsLoading,
    error: distributionsError
  } = useSentimentDistributions(selectedProduct, 'year', startDate, endDate, filters.cities);

  // Distribution chart data - simplified for yearly view only
  const getDistributionChartData = () => {
    if (!distributionsData || !Array.isArray(distributionsData)) {
      return null;
    }

    return {
      labels: distributionsData.map(item => item.year?.toString()),
      datasets: [
        {
          label: 'Positive (%)',
          data: distributionsData.map(item => item.positive),
          backgroundColor: 'rgba(76, 175, 80, 0.8)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 1,
          stack: 'stack1',
          datalabels: {
            display: true,
            color: 'rgba(76, 175, 80, 1)',
            font: {
              weight: 'bold',
              size: 12
            },
            formatter: (value, context) => {
              return `${Math.round(value)}%`;
            },
            anchor: 'end',
            align: 'top',
            offset: 4
          }
        },
        {
          label: 'Negative (%)',
          data: distributionsData.map(item => -item.negative),
          backgroundColor: 'rgba(244, 67, 54, 0.8)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 1,
          stack: 'stack1',
          datalabels: {
            display: true,
            color: 'rgba(244, 67, 54, 1)',
            font: {
              weight: 'bold',
              size: 12
            },
            formatter: (value, context) => {
              const originalValue = distributionsData[context.dataIndex].negative;
              return `${Math.round(originalValue)}%`;
            },
            anchor: 'start',
            align: 'bottom',
            offset: 4
          }
        }
      ]
    };
  };

  // Chart options for distribution charts - EXACT same as SentimentTimeline
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      datalabels: {
        display: false // Will be controlled per dataset
      },
      legend: {
        position: 'bottom',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataIndex = context.dataIndex;
            const isPositive = context.dataset.label === 'Positive (%)';
            const distributionItem = distributionsData[dataIndex];
            const percentage = isPositive ? distributionItem.positive : distributionItem.negative;
            return `${context.dataset.label}: ${percentage.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        title: {
          display: true,
          text: 'Year',
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
        beginAtZero: true,
        min: -100,
        max: 100,
        title: {
          display: false
        },
        ticks: {
          callback: function(value) {
            if (value > 0) {
              return `${value}%`;
            } else if (value < 0) {
              return `${Math.abs(value)}%`;
            } else {
              return '0%';
            }
          },
          stepSize: 25,
          color: function(context) {
            if (context.tick.value > 0) {
              return 'rgba(76, 175, 80, 1)'; // Green for positive
            } else if (context.tick.value < 0) {
              return 'rgba(244, 67, 54, 1)'; // Red for negative
            }
            return 'rgba(0, 0, 0, 0.8)'; // Black for zero
          }
        },
        grid: {
          display: true,
          color: function(context) {
            if (context.tick.value === 0) {
              return 'rgba(0, 0, 0, 0.8)'; // Darker line for zero axis
            }
            return 'rgba(0, 0, 0, 0.1)';
          },
          lineWidth: function(context) {
            if (context.tick.value === 0) {
              return 2; // Thicker line for zero axis
            }
            return 1;
          }
        }
      }
    },
    elements: {
      bar: {
        borderSkipped: false,
      }
    },
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 30,
        bottom: 10
      }
    },
    datasets: {
      bar: {
        categoryPercentage: 0.8,
        barPercentage: 0.9,
        maxBarThickness: 80
      }
    }
  };

  const distributionChartData = getDistributionChartData();

  // Loading state - include date range loading
  if (isDateRangeLoading || isDistributionsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">
            {isDateRangeLoading ? 'Loading date range...' : 'Loading sentiment distribution...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state - include date range error
  if (dateRangeError || distributionsError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl text-red-400 mb-4">⚠️</div>
          <p className="text-red-500 mb-4">
            Error loading {dateRangeError ? 'date range' : 'sentiment distribution'}: {(dateRangeError || distributionsError)?.message}
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!distributionsData || distributionsData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl text-gray-400 mb-4">📊</div>
          <p className="text-gray-500">No sentiment distribution data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Professional Header */}
      <h2 className="text-xl font-semibold text-black mb-1">Sentiment Distribution</h2>
      <p className="text-sm text-black mb-4">Yearly sentiment breakdown showing positive and negative percentages in a mirrored bar chart.</p>
      
      {/* Chart Container with Increased Height */}
      <div className="h-96">
        {distributionChartData && (
          <Bar 
            key={`dashboard-distribution-chart-${selectedProduct || 'all'}-year`}
            data={distributionChartData} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  display: true,
                  position: 'bottom',
                  align: 'center',
                  labels: {
                    font: { size: 10 },
                    usePointStyle: true,
                    padding: 15,
                    color: '#374151'
                  }
                }
              },
              scales: {
                ...chartOptions.scales,
                x: {
                  ...chartOptions.scales.x,
                  title: {
                    ...chartOptions.scales.x.title,
                    color: '#6b7280'
                  },
                  ticks: {
                    ...chartOptions.scales.x.ticks,
                    font: { size: 11 },
                    color: '#6b7280'
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                  }
                },
                y: {
                  ...chartOptions.scales.y,
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    font: { size: 11 }
                  },
                  grid: {
                    ...chartOptions.scales.y.grid
                  }
                }
              }
            }}
            redraw={true}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardSentimentDistribution;