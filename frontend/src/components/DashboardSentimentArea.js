import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const DashboardSentimentArea = ({ timelineData, isLoading, error }) => {
  console.log('DashboardSentimentArea received data:', timelineData);

  // Create chart data for stacked area chart - using unified data source
  const getStackedAreaChartData = () => {
    if (!timelineData || !timelineData.timeSeries) {
      return null;
    }

    const datasets = [
      {
        label: 'Positive',
        data: timelineData.timeSeries.map(item => item.positive),
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
        data: timelineData.timeSeries.map(item => item.negative),
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
      labels: timelineData.timeSeries.map(item => item.month),
      datasets: datasets
    };
    
    // Attach timeSeries data directly to the chart data object for tooltip access
    chartData.processedData = timelineData.timeSeries;
    
    return chartData;
  };

  // Chart options for stacked area charts - EXACT same as SentimentTimeline
  const stackedAreaChartOptions = {
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

  const stackedAreaChartData = getStackedAreaChartData();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading sentiment area chart...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl text-red-400 mb-4">⚠️</div>
          <p className="text-red-500 mb-4">
            Error loading sentiment area chart: {error?.message}
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!timelineData || !timelineData.timeSeries || timelineData.timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl text-gray-400 mb-4">📊</div>
          <p className="text-gray-500">No sentiment area data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Professional Header */}
      <h2 className="text-xl font-semibold text-black mb-1">Sentiment Area Chart</h2>
      <p className="text-sm text-black mb-4">Stacked area visualization showing the proportion of positive and negative sentiment over time.</p>
      
      {/* Chart Container with Increased Height */}
      <div className="h-96">
        {stackedAreaChartData && (
          <Line 
            key={`dashboard-stacked-area-chart`}
            data={stackedAreaChartData} 
            options={{
              ...stackedAreaChartOptions,
              plugins: {
                ...stackedAreaChartOptions.plugins,
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
                ...stackedAreaChartOptions.scales,
                x: {
                  ...stackedAreaChartOptions.scales.x,
                  title: {
                    ...stackedAreaChartOptions.scales.x.title,
                    color: '#6b7280'
                  },
                  ticks: {
                    ...stackedAreaChartOptions.scales.x.ticks,
                    font: { size: 11 },
                    color: '#6b7280'
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                  }
                },
                y: {
                  ...stackedAreaChartOptions.scales.y,
                  title: {
                    ...stackedAreaChartOptions.scales.y.title,
                    color: '#6b7280'
                  },
                  ticks: {
                    ...stackedAreaChartOptions.scales.y.ticks,
                    font: { size: 11 },
                    color: '#6b7280'
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
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

export default DashboardSentimentArea;
