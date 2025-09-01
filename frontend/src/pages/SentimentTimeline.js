import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import { useSentimentTrends, useSentimentDistributions, useProductDateRange } from '../hooks/useNewSentimentQueries';
import Card from '../components/ui/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const SentimentTimeline = ({ selectedProduct: selectedProductProp }) => {
  const navigate = useNavigate();
  const { selectedProduct, hasSelection } = useProductSelection();
  
  // Use the prop if provided, otherwise fall back to context
  const currentSelectedProduct = selectedProductProp || selectedProduct;
  
  const [activeTab, setActiveTab] = useState('year'); // Changed to 'year' to match API period parameter
  
  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Neutral sentiment toggle state
  const [showNeutral, setShowNeutral] = useState(false);
  
  // Date filter dropdown toggle state
  const [showDateFilters, setShowDateFilters] = useState(false);
  
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Summary dropdown state
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  
  // Date range query to get product's earliest and latest dates
  const {
    data: dateRangeData,
    isLoading: isDateRangeLoading,
    error: dateRangeError
  } = useProductDateRange(currentSelectedProduct);
  
  // TanStack Query hooks for the new unified endpoints
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
    error: trendsError,
    refetch: refetchTrends
  } = useSentimentTrends(currentSelectedProduct, startDate, endDate);
  
  const {
    data: distributionsData,
    isLoading: isDistributionsLoading,
    error: distributionsError
  } = useSentimentDistributions(currentSelectedProduct, activeTab, startDate, endDate);
  
  // Handler for navigating to Product page
  const handleNavigateToProduct = () => {
    navigate('/product');
  };

  // Initialize date filters with dynamic product date range
  useEffect(() => {
    if (dateRangeData && dateRangeData.earliest_date && dateRangeData.latest_date) {
      console.log('Setting dynamic date range:', dateRangeData.earliest_date, 'to', dateRangeData.latest_date);
      setStartDate(dateRangeData.earliest_date);
      setEndDate(dateRangeData.latest_date);
    }
  }, [dateRangeData]);



  // Chart data preparation functions for new API format
  const getTimeSeriesChartData = () => {
    if (!trendsData || !trendsData.timeSeries) {
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
        pointHoverRadius: 0,
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
        data: trendsData.timeSeries.map(item => item.neutral || 0),
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
      labels: trendsData.timeSeries.map(item => item.month),
      datasets: datasets
    };
  };

  const getDistributionChartData = () => {
    if (!distributionsData || !Array.isArray(distributionsData)) {
      return null;
    }

    // Determine the label key based on active tab
    let labelKey = 'year';
    if (activeTab === 'month') labelKey = 'month';
    if (activeTab === 'day_of_week') labelKey = 'day';

    return {
      labels: distributionsData.map(item => item[labelKey]?.toString()),
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

  // Create chart data for stacked area chart
  const getStackedAreaChartData = () => {
    if (!trendsData || !trendsData.timeSeries) {
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
    
    // Attach timeSeries data directly to the chart data object for tooltip access
    chartData.processedData = trendsData.timeSeries;
    
    return chartData;
  };

  // Chart options for stacked area charts
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

  // Chart options for distribution charts
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
          text: activeTab === 'year' ? 'Year' : activeTab === 'month' ? 'Month' : 'Day of Week',
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

  // Time series chart options (for line chart)
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
            const timeSeriesItem = trendsData.timeSeries[dataIndex];
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

  // Helper function to generate dynamic insights summary
  const generateSentimentInsights = () => {
    if (!trendsData || !distributionsData || !trendsData.timeSeries || distributionsData.length === 0) {
      return null;
    }

    const timeSeries = trendsData.timeSeries;
    const summary = trendsData.summary;
    
    // Calculate trend direction
    const firstMonth = timeSeries[0];
    const lastMonth = timeSeries[timeSeries.length - 1];
    const positiveChange = lastMonth.positive - firstMonth.positive;
    const negativeChange = lastMonth.negative - firstMonth.negative;
    
    // Find peak and low points
    const positiveValues = timeSeries.map(item => item.positive);
    const negativeValues = timeSeries.map(item => item.negative);
    const maxPositive = Math.max(...positiveValues);
    const minPositive = Math.min(...positiveValues);
    const maxNegative = Math.max(...negativeValues);
    const minNegative = Math.min(...negativeValues);
    
    // Distribution analysis (current tab)
    const avgDistributionPositive = distributionsData.reduce((sum, item) => sum + item.positive, 0) / distributionsData.length;
    const avgDistributionNegative = distributionsData.reduce((sum, item) => sum + item.negative, 0) / distributionsData.length;
    
    // Generate time series insights
    let timeSeriesInsight = `Analysis of ${summary.totalReviews.toLocaleString()} reviews shows an overall sentiment of ${summary.avgPositive}% positive and ${summary.avgNegative}% negative. `;
    
    if (Math.abs(positiveChange) > 5) {
      timeSeriesInsight += positiveChange > 0 
        ? `Positive sentiment has improved by ${positiveChange.toFixed(1)} percentage points over the selected period, `
        : `Positive sentiment has declined by ${Math.abs(positiveChange).toFixed(1)} percentage points over the selected period, `;
    } else {
      timeSeriesInsight += `Positive sentiment has remained relatively stable over the selected period, `;
    }
    
    timeSeriesInsight += `ranging from ${minPositive.toFixed(1)}% to ${maxPositive.toFixed(1)}%. `;
    
    if (summary.avgPositive > summary.avgNegative * 2) {
      timeSeriesInsight += `Customer feedback is predominantly positive with sentiment consistently above 60%.`;
    } else if (summary.avgNegative > summary.avgPositive) {
      timeSeriesInsight += `Customer feedback shows concerning negative sentiment patterns that require attention.`;
    } else {
      timeSeriesInsight += `Customer feedback shows mixed sentiment with room for improvement.`;
    }

    // Generate area chart insights
    let areaChartInsight = `The stacked area visualization reveals that sentiment distribution `;
    
    // Calculate area coverage patterns
    const dominantPositiveMonths = timeSeries.filter(item => item.positive > 70).length;
    const dominantNegativeMonths = timeSeries.filter(item => item.negative > 50).length;
    const balancedMonths = timeSeries.filter(item => Math.abs(item.positive - item.negative) < 20).length;
    
    if (dominantPositiveMonths > timeSeries.length * 0.6) {
      areaChartInsight += `shows consistently strong positive coverage across ${dominantPositiveMonths} out of ${timeSeries.length} months analyzed. `;
    } else if (dominantNegativeMonths > timeSeries.length * 0.4) {
      areaChartInsight += `reveals concerning negative sentiment dominance in ${dominantNegativeMonths} months, indicating areas requiring immediate attention. `;
    } else if (balancedMonths > timeSeries.length * 0.5) {
      areaChartInsight += `demonstrates balanced sentiment competition with ${balancedMonths} months showing mixed feedback patterns. `;
    } else {
      areaChartInsight += `exhibits variable sentiment patterns with alternating positive and negative dominance periods. `;
    }
    
    // Analyze sentiment volatility
    const positiveStdDev = Math.sqrt(positiveValues.reduce((sum, val) => sum + Math.pow(val - summary.avgPositive, 2), 0) / positiveValues.length);
    
    if (positiveStdDev < 10) {
      areaChartInsight += `The sentiment area remains stable with low volatility (σ=${positiveStdDev.toFixed(1)}), suggesting consistent customer experience.`;
    } else if (positiveStdDev > 20) {
      areaChartInsight += `High sentiment volatility (σ=${positiveStdDev.toFixed(1)}) indicates significant fluctuations in customer satisfaction requiring investigation.`;
    } else {
      areaChartInsight += `Moderate sentiment volatility (σ=${positiveStdDev.toFixed(1)}) shows normal fluctuations in customer feedback patterns.`;
    }
    
    // Generate distribution insights
    let distributionInsight = ``;
    const distributionType = activeTab === 'year' ? 'yearly' : activeTab === 'month' ? 'monthly' : 'day-of-week';
    
    if (activeTab === 'month') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const bestMonth = distributionsData.reduce((best, current) => current.positive > best.positive ? current : best);
      const worstMonth = distributionsData.reduce((worst, current) => current.negative > worst.negative ? current : worst);
      
      distributionInsight = `Monthly analysis reveals ${bestMonth.month} as the peak positive sentiment month (${bestMonth.positive.toFixed(1)}%) and ${worstMonth.month} showing the highest negative sentiment (${worstMonth.negative.toFixed(1)}%). `;
    } else if (activeTab === 'day_of_week') {
      const bestDay = distributionsData.reduce((best, current) => current.positive > best.positive ? current : best);
      const worstDay = distributionsData.reduce((worst, current) => current.negative > worst.negative ? current : worst);
      
      distributionInsight = `Weekly pattern analysis shows ${bestDay.day} as the most positive day (${bestDay.positive.toFixed(1)}%) while ${worstDay.day} shows the highest negative sentiment (${worstDay.negative.toFixed(1)}%). `;
    } else {
      const bestYear = distributionsData.reduce((best, current) => current.positive > best.positive ? current : best);
      const worstYear = distributionsData.reduce((worst, current) => current.negative > worst.negative ? current : worst);
      
      distributionInsight = `Yearly sentiment analysis indicates ${bestYear.year} as the peak positive year (${bestYear.positive.toFixed(1)}%) and ${worstYear.year} showing concerning negative patterns (${worstYear.negative.toFixed(1)}%). `;
    }
    
    distributionInsight += `The ${distributionType} distribution averages ${avgDistributionPositive.toFixed(1)}% positive and ${avgDistributionNegative.toFixed(1)}% negative sentiment.`;
    
    return {
      timeSeriesInsight,
      areaChartInsight,
      distributionInsight,
      summary: {
        totalReviews: summary.totalReviews,
        avgPositive: summary.avgPositive,
        avgNegative: summary.avgNegative,
        avgNeutral: summary.avgNeutral,
        trendDirection: positiveChange > 5 ? 'improving' : positiveChange < -5 ? 'declining' : 'stable',
        sentimentLevel: summary.avgPositive > summary.avgNegative * 2 ? 'positive' : summary.avgNegative > summary.avgPositive ? 'negative' : 'mixed'
      }
    };
  };

  const timeSeriesChartData = getTimeSeriesChartData();
  const stackedAreaChartData = getStackedAreaChartData();
  const distributionChartData = getDistributionChartData();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.titleContainer}>
            <h1 style={styles.title}>Sentiment Timeline</h1>
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
                aria-label="Information about Sentiment Timeline"
              >
                <svg style={styles.tooltipIcon} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Tooltip */}
              {showTooltip && (
                <div style={styles.tooltip}>
                  <div style={styles.tooltipContent}>
                    <h3 style={styles.tooltipTitle}>About Sentiment Timeline</h3>
                    <p style={styles.tooltipText}>
                      Analyze customer sentiment patterns over time and across different dimensions. This page provides:
                    </p>
                    <ul style={styles.tooltipList}>
                      <li><strong>Time Series Chart:</strong> Track sentiment trends month by month with optional neutral sentiment line</li>
                      <li><strong>Sentiment Area Chart:</strong> Visualize sentiment proportions over time with stacked area visualization</li>
                      <li><strong>Distribution Charts:</strong> View sentiment patterns across years, months, and days of the week</li>
                      <li><strong>Date Filtering:</strong> Customize analysis period using the date range filters</li>
                      <li><strong>Summary Statistics:</strong> Get overall metrics for the selected time period</li>
                    </ul>
                    <p style={styles.tooltipText}>
                      Select a product and use the date filters to explore sentiment patterns and trends.
                    </p>
                  </div>
                  {/* Arrow pointing up */}
                  <div style={styles.tooltipArrow}></div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Insights Summary */}
        {(hasSelection || selectedProductProp) && !isTrendsLoading && !isDistributionsLoading && !trendsError && !distributionsError && (() => {
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
                        Click to {summaryExpanded ? 'hide' : 'view'} detailed sentiment analysis insights
                      </h4>
                      <p style={styles.summaryToggleSubtitle}>
                        Time series trends and distribution patterns analysis
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
                    {/* Time Series Analysis */}
                    <div style={styles.insightSection}>
                      <div style={styles.insightHeader}>
                        <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                        <h5 style={styles.insightTitle}>Time Series Trend Analysis</h5>
                      </div>
                      <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                        <ul style={styles.insightList}>
                          <li style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insights.timeSeriesInsight}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Area Chart Analysis */}
                    <div style={styles.insightSection}>
                      <div style={styles.insightHeader}>
                        <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                        <h5 style={styles.insightTitle}>Sentiment Area Coverage Analysis</h5>
                      </div>
                      <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                        <ul style={styles.insightList}>
                          <li style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insights.areaChartInsight}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Distribution Analysis */}
                    <div style={styles.insightSection}>
                      <div style={styles.insightHeader}>
                        <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                        <h5 style={styles.insightTitle}>
                          {activeTab === 'year' ? 'Yearly' : activeTab === 'month' ? 'Monthly' : 'Weekly'} Distribution Analysis
                        </h5>
                      </div>
                      <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                        <ul style={styles.insightList}>
                          <li style={styles.insightListItem}>
                            <span style={styles.insightBullet}>•</span>
                            <span style={styles.insightText}>{insights.distributionInsight}</span>
                          </li>
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
        {!hasSelection && !selectedProductProp && (
          <Card>
            <div 
              className="text-center cursor-pointer hover:bg-gray-200 transition-colors rounded-lg p-2" 
              onClick={handleNavigateToProduct}
              style={{ padding: '32px 16px' }}
            >
              <h3 className="text-lg font-semibold text-black mb-2">No product selected</h3>
              <p className="text-black">
                Go to the <strong>Product</strong> page to select a product for sentiment timeline analysis.
              </p>
            </div>
          </Card>
        )}

        {/* Content when product is selected */}
        {(hasSelection || selectedProductProp) && (
          <>
            {/* Date Range Loading */}
            {isDateRangeLoading && (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>Loading date range for product...</p>
              </div>
            )}

            {/* Date Range Error */}
            {dateRangeError && (
              <div style={styles.error}>
                <p>Error loading product date range: {dateRangeError?.message || 'Error loading date range'}</p>
              </div>
            )}

            {/* Show content only when date range is loaded */}
            {!isDateRangeLoading && !dateRangeError && dateRangeData && (
              <>

            {/* Summary Statistics */}
            {!isTrendsLoading && !trendsError && trendsData && trendsData.summary && (
          <div style={styles.summaryStats}>
            <h3 style={styles.summaryTitle}>Summary Statistics for the current date range</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {trendsData.summary.totalReviews.toLocaleString()}
                </div>
                <div style={styles.statLabel}>Total Reviews</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {trendsData.summary.avgPositive}%
                </div>
                <div style={styles.statLabel}>Avg. Positive</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {trendsData.summary.avgNeutral}%
                </div>
                <div style={styles.statLabel}>Avg. Neutral</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  {trendsData.summary.avgNegative}%
                </div>
                <div style={styles.statLabel}>Avg. Negative</div>
              </div>
            </div>
          </div>
        )}

        {/* Date Filter Dropdown */}
        <div style={styles.dateFilterDropdown}>
          <button 
            style={styles.dropdownToggle}
            onClick={() => setShowDateFilters(!showDateFilters)}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <span>Date Range Filters</span>
            <span style={{...styles.dropdownArrow, transform: showDateFilters ? 'rotate(180deg)' : 'rotate(0deg)'}}>
              ▼
            </span>
          </button>
          
          {showDateFilters && (
            <div style={styles.dropdownContent}>
              <div style={styles.dateFilters}>
                <div style={styles.dateFilterGroup}>
                  <label style={styles.dateLabel}>Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={styles.dateInput}
                    max={endDate}
                  />
                </div>
                <div style={styles.dateFilterGroup}>
                  <label style={styles.dateLabel}>End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={styles.dateInput}
                    min={startDate}
                  />
                </div>
                <button
                  onClick={refetchTrends}
                  disabled={isTrendsLoading}
                  style={styles.refreshButton}
                >
                  {isTrendsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Time Series Chart Section */}
        <div style={styles.timeSeriesSection}>
          <h3 style={styles.timeSeriesTitle}>Sentiment Trend Over Time</h3>
          <p style={styles.timeSeriesDescription}>
            Track sentiment changes over your selected date range with monthly trend analysis
          </p>
          
          {/* Neutral Toggle Control */}
          <div style={styles.neutralToggleContainer}>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showNeutral}
                  onChange={(e) => setShowNeutral(e.target.checked)}
                  style={styles.checkbox}
                />
                Show Neutral Sentiment
              </label>
            </div>
          </div>

          {/* Time Series Chart */}
          {isTrendsLoading && (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>Loading time series data...</p>
            </div>
          )}

          {trendsError && (
            <div style={styles.error}>
              <p>Error loading time series data: {trendsError?.message || 'Error loading trends data'}</p>
              <button 
                onClick={refetchTrends}
                style={styles.retryButton}
              >
                Retry
              </button>
            </div>
          )}

          {!isTrendsLoading && !trendsError && timeSeriesChartData && trendsData && (
            <div style={styles.chartSection}>
              <div style={styles.chartContainer}>
                <Line 
                  key={`time-series-chart-${currentSelectedProduct || 'all'}-${startDate}-${endDate}-${showNeutral}`}
                  data={timeSeriesChartData} 
                  options={timeSeriesChartOptions}
                  redraw={true}
                />
              </div>
            </div>
          )}

          {!isTrendsLoading && !trendsError && trendsData && (!trendsData.timeSeries || trendsData.timeSeries.length === 0) && (
            <div style={styles.noDataCard}>
              <h3 style={styles.noDataTitle}>No Data Available</h3>
              <p style={styles.noDataText}>
                {currentSelectedProduct 
                  ? `No monthly review data found for the selected product (${currentSelectedProduct}) in the specified date range.`
                  : 'No monthly review data found in the specified date range.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Sentiment Area Chart Section */}
        <div style={styles.timeSeriesSection}>
          <h3 style={styles.timeSeriesTitle}>Sentiment Area Analysis</h3>
          <p style={styles.timeSeriesDescription}>
            Stacked area chart showing sentiment proportions over time with visual emphasis on positive/negative distribution
          </p>

          {/* Area Chart */}
          {isTrendsLoading && (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>Loading area chart data...</p>
            </div>
          )}

          {trendsError && (
            <div style={styles.error}>
              <p>Error loading area chart data: {trendsError?.message || 'Error loading trends data'}</p>
              <button 
                onClick={refetchTrends}
                style={styles.retryButton}
              >
                Retry
              </button>
            </div>
          )}

          {!isTrendsLoading && !trendsError && stackedAreaChartData && trendsData && (
            <div style={styles.chartSection}>
              <div style={styles.chartContainer}>
                <Line 
                  key={`stacked-area-chart-${currentSelectedProduct || 'all'}-${startDate}-${endDate}`}
                  data={stackedAreaChartData} 
                  options={stackedAreaChartOptions}
                  redraw={true}
                />
              </div>
            </div>
          )}

          {!isTrendsLoading && !trendsError && trendsData && (!trendsData.timeSeries || trendsData.timeSeries.length === 0) && (
            <div style={styles.noDataCard}>
              <h3 style={styles.noDataTitle}>No Data Available</h3>
              <p style={styles.noDataText}>
                {currentSelectedProduct 
                  ? `No monthly review data found for the selected product (${currentSelectedProduct}) in the specified date range.`
                  : 'No monthly review data found in the specified date range.'
                }
              </p>
            </div>
          )}
        </div>

                 {/* Distribution Charts */}
         <div style={styles.tabsContainer}>
           <h3 style={styles.tabsTitle}>
             Sentiment Distribution across {
               activeTab === 'year' ? 'Years' :
               activeTab === 'month' ? 'Months' : 'Days'
             }
           </h3>
           <div style={styles.tabs}>
             <button
               style={{
                 ...styles.tab,
                 ...(activeTab === 'year' ? styles.activeTab : {})
               }}
               onClick={() => setActiveTab('year')}
             >
               Yearly Distribution
             </button>
             <button
               style={{
                 ...styles.tab,
                 ...(activeTab === 'month' ? styles.activeTab : {})
               }}
               onClick={() => setActiveTab('month')}
             >
               Monthly Distribution
             </button>
             <button
               style={{
                 ...styles.tab,
                 ...(activeTab === 'day_of_week' ? styles.activeTab : {})
               }}
               onClick={() => setActiveTab('day_of_week')}
             >
               Daily Distribution
             </button>
           </div>

           <div style={styles.tabContent}>
             {isDistributionsLoading && (
               <div style={styles.loading}>
                 <div style={styles.spinner}></div>
                 <p>Loading {activeTab === 'year' ? 'yearly' : activeTab === 'month' ? 'monthly' : 'daily'} data...</p>
               </div>
             )}

             {distributionsError && (
               <div style={styles.error}>
                 <p>Error loading distribution data: {distributionsError?.message || 'Error loading distribution data'}</p>
               </div>
             )}

             {!isDistributionsLoading && !distributionsError && distributionChartData && (
               <div style={styles.chartSection}>
                 {activeTab === 'month' && (
                   <div style={styles.sectionHeader}>
                     <p style={styles.sectionDescription}>Sentiment distribution across months (January to December)</p>
                   </div>
                 )}
                 {activeTab === 'day_of_week' && (
                   <div style={styles.sectionHeader}>
                     <p style={styles.sectionDescription}>Sentiment distribution across days of the week</p>
                   </div>
                 )}
                 
                 <div style={styles.chartContainer}>
                   <Bar 
                     key={`distribution-chart-${currentSelectedProduct || 'all'}-${activeTab}-${startDate}-${endDate}`}
                     data={distributionChartData} 
                     options={chartOptions}
                     redraw={true}
                   />
                 </div>
               </div>
             )}

             {!isDistributionsLoading && !distributionsError && (!distributionsData || distributionsData.length === 0) && (
               <div style={styles.noDataCard}>
                 <h3 style={styles.noDataTitle}>No Data Available</h3>
                 <p style={styles.noDataText}>
                   {currentSelectedProduct 
                     ? `No ${activeTab === 'year' ? 'yearly' : activeTab === 'month' ? 'monthly' : 'daily'} review data found for the selected product (${currentSelectedProduct}).`
                     : `No ${activeTab === 'year' ? 'yearly' : activeTab === 'month' ? 'monthly' : 'daily'} review data found in the database.`
                   }
                 </p>
               </div>
             )}
           </div>
         </div>
            </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100%',
    backgroundColor: 'transparent'
  },
  content: {
    width: '100%',
    margin: '0',
    padding: '0'
  },
  header: {
    textAlign: 'left',
    marginBottom: '24px'
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    fontSize: '36px',
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
  subtitle: {
    fontSize: '18px',
    color: '#4a5568',
    margin: 0
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#c53030',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    marginTop: '10px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  chartSection: {
    marginTop: '30px'
  },
  chartContainer: {
    backgroundColor: '#f9fafb',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '30px',
    height: '600px'
  },
  summaryStats: {
    backgroundColor: '#e5e7eb',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  },
  summaryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },
  statCard: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#667eea',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  noDataCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    border: '2px dashed #cbd5e0'
  },
  noDataTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '10px',
    margin: '0 0 10px 0'
  },
  noDataText: {
    fontSize: '16px',
    color: '#718096',
    margin: 0
  },
  tabsContainer: {
    backgroundColor: '#e5e7eb',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '30px'
  },
  tabsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    borderBottom: '2px solid #e2e8f0'
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#4a5568',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease'
  },
  activeTab: {
    color: '#667eea',
    borderBottomColor: '#667eea'
  },
  tabContent: {
    minHeight: '400px'
  },
  timeSeriesSection: {
    backgroundColor: '#e5e7eb',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '30px'
  },
  timeSeriesTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '8px',
    margin: '0 0 8px 0'
  },
  timeSeriesDescription: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '25px',
    margin: '0 0 25px 0'
  },
  dateFilterDropdown: {
    backgroundColor: '#e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    border: '1px solid #d1d5db'
  },
  dropdownToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4a5568',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease'
  },
  dropdownArrow: {
    fontSize: '12px',
    color: '#667eea',
    transition: 'transform 0.2s ease',
    marginLeft: '10px'
  },
  dropdownContent: {
    borderTop: '1px solid #d1d5db',
    padding: '15px 20px'
  },
  dateFilters: {
    display: 'flex',
    gap: '15px',
    alignItems: 'end',
    flexWrap: 'wrap'
  },
  dateFilterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    minWidth: '150px'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    minWidth: '150px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  dateLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '5px'
  },
  dateInput: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#f9fafb',
    color: '#000000',
    transition: 'border-color 0.2s ease',
    outline: 'none'
  },
  refreshButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    height: 'fit-content',
    minWidth: '100px'
  },
  neutralToggleContainer: {
    padding: '15px 0',
    marginBottom: '20px'
  },
  sectionHeader: {
    marginBottom: '20px',
    textAlign: 'center'
  },
  sectionDescription: {
    fontSize: '16px',
    color: '#4a5568',
    margin: 0
  },
  dateRangeInfo: {
    backgroundColor: '#e6f3ff',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #b3d9ff'
  },
  dateRangeText: {
    fontSize: '14px',
    color: '#2c5aa0',
    margin: 0,
    textAlign: 'center'
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
    backgroundColor: '#22c55e',
    borderRadius: '3px'
  },
  insightTitle: {
    fontWeight: '600',
    color: '#111827',
    margin: '0'
  },
  insightContent: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px'
  },
  insightText: {
    color: '#000000',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0'
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
  }
};

export default SentimentTimeline; 