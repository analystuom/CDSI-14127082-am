import React, { useState } from 'react';
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

const DashboardSentimentLine = ({ timelineData, isLoading, error }) => {
  // Neutral sentiment toggle state
  const [showNeutral, setShowNeutral] = useState(false);
  
  console.log('DashboardSentimentLine received data:', timelineData);

  // Chart data preparation function
  const getTimeSeriesChartData = () => {
    if (!timelineData || !timelineData.timeSeries) {
      return null;
    }

    const datasets = [
      {
        label: 'Positive',
        data: timelineData.timeSeries.map(item => item.positive),
        borderColor: 'rgba(76, 175, 80, 1)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        datalabels: {
          display: false
        }
      },
      {
        label: 'Negative',
        data: timelineData.timeSeries.map(item => item.negative),
        borderColor: 'rgba(244, 67, 54, 1)',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        datalabels: {
          display: false
        }
      }
    ];

    // Add neutral dataset if toggled on
    if (showNeutral) {
      datasets.push({
        label: 'Neutral',
        data: timelineData.timeSeries.map(item => item.neutral || 0),
        borderColor: 'rgba(158, 158, 158, 1)',
        backgroundColor: 'rgba(158, 158, 158, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        datalabels: {
          display: false
        }
      });
    }

    return {
      labels: timelineData.timeSeries.map(item => item.month),
      datasets: datasets
    };
  };

  // Time series chart options - EXACT same as SentimentTimeline
  const timeSeriesChartOptions = {
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
          padding: 20
        }
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataIndex = context.dataIndex;
            const timeSeriesItem = timelineData.timeSeries[dataIndex];
            const label = context.dataset.label;
            let percentage;
            
            if (label === 'Positive') {
              percentage = timeSeriesItem.positive;
            } else if (label === 'Neutral') {
              percentage = timeSeriesItem.neutral || 0;
            } else {
              percentage = timeSeriesItem.negative;
            }
            
            return `${label}: ${percentage.toFixed(1)}%`;
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
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 0,
        hoverRadius: 0,
        borderWidth: 0
      }
    },
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 30,
        bottom: 10
      }
    }
  };

  const timeSeriesChartData = getTimeSeriesChartData();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading sentiment timeline...</p>
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
            Error loading sentiment timeline: {error?.message}
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
          <div className="text-4xl text-gray-400 mb-4">📈</div>
          <p className="text-gray-500">No sentiment timeline data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Professional Header with Toggle */}
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black">Sentiment Timeline</h2>
        <label className="flex items-center gap-2 text-sm text-black cursor-pointer">
          <input
            type="checkbox"
            checked={showNeutral}
            onChange={(e) => setShowNeutral(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          Show Neutral Sentiment
        </label>
      </div>
      <p className="text-sm text-black mb-4">Monthly sentiment trends over time showing positive and negative percentages.</p>

      {/* Chart Container with Increased Height */}
      <div className="h-96">
        {timeSeriesChartData && (
          <Line 
            key={`dashboard-time-series-chart-${showNeutral}`}
            data={timeSeriesChartData} 
            options={{
              ...timeSeriesChartOptions,
              plugins: {
                ...timeSeriesChartOptions.plugins,
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
                ...timeSeriesChartOptions.scales,
                x: {
                  ...timeSeriesChartOptions.scales.x,
                  title: {
                    ...timeSeriesChartOptions.scales.x.title,
                    color: '#6b7280'
                  },
                  ticks: {
                    ...timeSeriesChartOptions.scales.x.ticks,
                    font: { size: 11 },
                    color: '#6b7280'
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                  }
                },
                y: {
                  ...timeSeriesChartOptions.scales.y,
                  title: {
                    ...timeSeriesChartOptions.scales.y.title,
                    color: '#6b7280'
                  },
                  ticks: {
                    ...timeSeriesChartOptions.scales.y.ticks,
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

export default DashboardSentimentLine;
