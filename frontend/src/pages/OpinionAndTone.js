import React, { useState, useEffect } from 'react';
import { Bar, Radar } from 'react-chartjs-2';
import axios from 'axios';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import { useAuth } from '../contexts/AuthContext';
import SankeyChart from '../components/SankeyChart';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartDataLabels
);

const OpinionAndTone = () => {
  // Context and auth
  const { 
    selectedProduct, 
    comparisonProduct1, 
    comparisonProduct2, 
    hasSelection,
    emotionAnalysisData,
    hasEmotionAnalysisDataForCurrent,
    storeEmotionAnalysisData,
    loadingStates,
    setLoadingState,
    getSelectedProductTitle
  } = useProductSelection();
  const { getAuthHeaders } = useAuth();

  // Component state
  const [error, setError] = useState(null);
  const [sankeyError, setSankeyError] = useState(null);
  
  // User confirmation and progress tracking
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProceedBox, setShowProceedBox] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [hasBeenPrompted, setHasBeenPrompted] = useState(false);
  
  // Tooltip state for page header
  const [showTooltip, setShowTooltip] = useState(false);

  // Derived state from context
  const isLoading = loadingStates.emotionAnalysis;
  const analysisInitiated = emotionAnalysisData.analysisInitiated;
  const positiveChartData = emotionAnalysisData.positiveChartData;
  const negativeChartData = emotionAnalysisData.negativeChartData;
  const contextChartData = emotionAnalysisData.contextChartData;
  const radarData = emotionAnalysisData.radarData;
  const analysisStats = emotionAnalysisData.analysisStats;
  const sankeyData = emotionAnalysisData.sankeyData;

  // Color palettes for emotions
  const emotionColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];

  // Emotion categories
  const emotionCategories = {
    positive: {
      title: 'Positive Emotions',
      description: 'These words generally describe pleasant feelings and states of mind.',
      emotions: ['admiration', 'approval', 'love', 'joy', 'optimism', 'gratitude', 'caring', 'excitement', 'relief', 'amusement'],
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5', '#059669', '#047857', '#065F46', '#064E3B']
    },
    negative: {
      title: 'Negative Emotions',
      description: 'These words typically describe unpleasant or distressing feelings.',
      emotions: ['disappointment', 'disapproval', 'annoyance', 'sadness', 'confusion', 'disgust', 'anger', 'fear', 'remorse', 'embarrassment', 'nervousness', 'grief'],
      colors: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', '#6B1D1D', '#5B1D1D']
    },
    contextDependent: {
      title: 'Context-Dependent',
      description: 'The emotional tone of these words heavily depends on the situation.',
      emotions: ['neutral', 'realization', 'desire', 'surprise', 'curiosity', 'pride'],
      colors: ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB']
    }
  };

  // API Functions
  const analyzeProductEmotions = async (productId) => {
    try {
      const response = await axios.get(`/api/analyze-product-emotions/${productId}`, {
        headers: getAuthHeaders(),
        params: {
          include_sankey_data: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing product emotions:', error);
      throw new Error(`Failed to analyze product emotions: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Get review count estimate for time calculation
  const getReviewCountEstimate = async (productId) => {
    try {
      const response = await axios.get(`/api/reviews/wordcloud-legacy?parent_asin=${productId}&limit=1`, {
        headers: getAuthHeaders()
      });
      // This gives us a sample to estimate total count - we'll use a rough estimate
      return 2000; // Conservative estimate for progress calculation
    } catch (error) {
      return 1000; // Fallback estimate
    }
  };

  // Data processing functions with progress tracking
  const processProductEmotionsWithProgress = async (productId, estimatedReviews) => {
    console.log(`Starting comprehensive emotion analysis for product: ${productId}`);
    
    // Calculate estimated time (roughly 0.05 seconds per review with MPS)
    const estimatedTimeMinutes = Math.ceil((estimatedReviews * 0.05) / 60);
    const estimatedTimeSeconds = Math.ceil(estimatedReviews * 0.05);
    
    // Set initial progress
    setProgressInfo({
      stage: 'Fetching Reviews',
      reviewCount: estimatedReviews,
      estimatedTime: estimatedTimeMinutes > 1 ? `${estimatedTimeMinutes} minutes` : `${estimatedTimeSeconds} seconds`,
      startTime: Date.now()
    });
    
    try {
      // Simulate progress updates during processing
      const progressInterval = setInterval(() => {
        setProgressInfo(prev => {
          if (!prev) return null;
          const elapsed = (Date.now() - prev.startTime) / 1000;
          const progress = Math.min(90, (elapsed / (estimatedTimeSeconds)) * 100);
          return {
            ...prev,
            stage: elapsed < estimatedTimeSeconds * 0.3 ? 'Cleaning Text' : 
                   elapsed < estimatedTimeSeconds * 0.8 ? 'Analyzing Emotions' : 'Aggregating Results',
            progress: progress
          };
        });
      }, 1000);
      
      // Call the backend endpoint
      const result = await analyzeProductEmotions(productId);
      
      clearInterval(progressInterval);
      
      // Final progress update
      setProgressInfo(prev => ({
        ...prev,
        stage: 'Complete',
        progress: 100
      }));
      
      console.log(`Backend analysis complete:`, result);
      
      if (!result.all_emotions || result.all_emotions.length === 0) {
        return { 
          allEmotions: [], 
          topEmotions: [],
          reviewCount: result.total_reviews || 0, 
          validAnalyses: result.processed_reviews || 0,
          productId,
          message: result.message,
          sankey_data: result.sankey_data || null
        };
      }

      // Convert backend format to frontend format
      const allEmotions = result.all_emotions.map(emotion => ({
        label: emotion.label,
        score: emotion.score
      }));

      const topEmotions = allEmotions.slice(0, 10);

      return { 
        allEmotions,
        topEmotions,
        reviewCount: result.total_reviews, 
        validAnalyses: result.processed_reviews,
        productId,
        message: result.message,
        sankey_data: result.sankey_data || null
      };
    } catch (error) {
      setProgressInfo(null);
      throw error;
    }
  };

  // Chart formatting functions for categorized emotions
  const formatCategorizedBarChartData = (productData, category) => {
    if (!productData || !productData.allEmotions || productData.allEmotions.length === 0) {
      return {
        labels: ['No data available'],
        datasets: [{
          label: 'No data',
          data: [0],
          backgroundColor: ['#E5E7EB'],
          borderColor: ['#E5E7EB'],
          borderWidth: 1,
        }]
      };
    }

    // Filter emotions based on category
    const categoryEmotions = productData.allEmotions.filter(emotion => 
      emotionCategories[category].emotions.includes(emotion.label.toLowerCase())
    );

    if (categoryEmotions.length === 0) {
      return {
        labels: ['No emotions found'],
        datasets: [{
          label: 'No data',
          data: [0],
          backgroundColor: ['#E5E7EB'],
          borderColor: ['#E5E7EB'],
          borderWidth: 1,
        }]
      };
    }

    return {
      labels: categoryEmotions.map(emotion => 
        emotion.label.charAt(0).toUpperCase() + emotion.label.slice(1)
      ),
      datasets: [{
        data: categoryEmotions.map(emotion => emotion.score),
        backgroundColor: categoryEmotions.map((_, index) => 
          emotionCategories[category].colors[index % emotionCategories[category].colors.length]
        ),
        borderColor: categoryEmotions.map((_, index) => 
          emotionCategories[category].colors[index % emotionCategories[category].colors.length]
        ),
        borderWidth: 1,
      }]
    };
  };

  const formatRadarChartData = (primaryProductData) => {
    if (!primaryProductData || !primaryProductData.topEmotions || primaryProductData.topEmotions.length === 0) {
      return {
        labels: ['No data'],
        datasets: []
      };
    }

    // Use top 6 emotions for radar chart as specified in the workflow
    const top6Emotions = primaryProductData.topEmotions.slice(0, 6);
    
    if (top6Emotions.length === 0) {
      return {
        labels: ['No data'],
        datasets: []
      };
    }

    const emotionLabels = top6Emotions.map(emotion => emotion.label);

    // Create data array for the primary product only
    const data = emotionLabels.map(label => {
      const emotion = primaryProductData.topEmotions.find(e => e.label === label);
      return emotion ? emotion.score : 0;
    });

    const dataset = {
      label: getSelectedProductTitle() || `Product ${primaryProductData.productId.slice(-8)}`,
      data,
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.3)',
      borderWidth: 4,
      pointBackgroundColor: 'rgb(54, 162, 235)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(54, 162, 235)',
    };

    return {
      labels: emotionLabels.map(label => 
        label.charAt(0).toUpperCase() + label.slice(1)
      ),
      datasets: [dataset]
    };
  };

  // Main analysis function
  const startEmotionAnalysis = async () => {
    setLoadingState('emotionAnalysis', true);
    setError(null);
    setSankeyError(null);
    setProgressInfo(null);

    try {
      // Only analyze the primary selected product
      console.log('Analyzing emotions for primary product:', selectedProduct);

      // Get review count estimate for the primary product
      const estimatedReviews = await getReviewCountEstimate(selectedProduct);

      // Process only the primary product with progress tracking
      const primaryProductData = await processProductEmotionsWithProgress(
        selectedProduct, 
        estimatedReviews
      );

      // Format data for charts
      const formattedPositiveData = formatCategorizedBarChartData(primaryProductData, 'positive');
      const formattedNegativeData = formatCategorizedBarChartData(primaryProductData, 'negative');
      const formattedContextData = formatCategorizedBarChartData(primaryProductData, 'contextDependent');
      const formattedRadarData = formatRadarChartData(primaryProductData);

      // Store analysis statistics
      const analysisStatsData = {
        totalReviews: primaryProductData.reviewCount,
        processedReviews: primaryProductData.validAnalyses,
        message: primaryProductData.message
      };

      // Store all data in context (including Sankey data from API response)
      storeEmotionAnalysisData(
        formattedPositiveData,
        formattedNegativeData,
        formattedContextData,
        formattedRadarData,
        analysisStatsData,
        primaryProductData.sankey_data || null
      );

      console.log('Emotion analysis complete:', {
        primaryProduct: primaryProductData
      });

    } catch (err) {
      console.error('Error in emotion analysis:', err);
      setError(err.message || 'Failed to analyze emotions. Please try again.');
    } finally {
      setLoadingState('emotionAnalysis', false);
      setProgressInfo(null);
    }
  };

  // Handle user confirmation
  const handleUserConfirmation = (proceed) => {
    setShowConfirmDialog(false);
    setHasBeenPrompted(true);
    
    if (proceed) {
      startEmotionAnalysis();
    } else {
      setShowProceedBox(true);
    }
  };

  // Handle manual proceed
  const handleManualProceed = () => {
    setShowProceedBox(false);
    startEmotionAnalysis();
  };

  // Effect to show confirmation dialog when products change
  useEffect(() => {
    if (!hasSelection) {
      setError(null);
      setShowConfirmDialog(false);
      setShowProceedBox(false);
      setHasBeenPrompted(false);
      setProgressInfo(null);
      return;
    }

    // If we already have data for this product, don't show confirmation dialog
    if (hasEmotionAnalysisDataForCurrent()) {
      setHasBeenPrompted(true);
      return;
    }

    // Only show confirmation dialog if we haven't been prompted for this selection yet
    if (!hasBeenPrompted && !analysisInitiated) {
      setShowConfirmDialog(true);
    }
  }, [selectedProduct, hasSelection, hasEmotionAnalysisDataForCurrent, analysisInitiated, hasBeenPrompted]);

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Emotional Tone of Reviews',
        font: {
          size: 20,
          weight: 'bold'
        }
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 0.5,
        grid: {
          display: true,
        },
        title: {
          display: true,
          text: 'Average Emotion Score (0-0.5 scale)'
        },
        ticks: {
          display: false
        }
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
    },
    elements: {
      bar: {
        borderWidth: 0
      }
    }
  };



  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Emotions Radar Chart ',
        font: {
          size: 20,
          weight: 'bold'
        }
      },
      datalabels: {
        display: true,
        color: '#000',
        font: {
          size: 12,
          weight: 'bold'
        },
        formatter: (value, context) => {
          return value.toFixed(3);
        },
        anchor: 'end',
        align: 'end',
        offset: 10
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 0.5,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        pointLabels: {
          font: {
            size: 13,
          },
        },
        ticks: {
          display: false
        }
      },
    },
    elements: {
      point: {
        radius: 6,
        borderWidth: 3
      },
      line: {
        borderWidth: 4
      }
    }
  };

  // Confirmation Dialog Component
  const ConfirmationDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-200 rounded-lg shadow-xl p-8 max-w-md mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-black mb-4">
            Start Emotion Analysis?
          </h3>
          <p className="text-sm text-black mb-6">
            This process will analyze all reviews for the selected product using AI emotion detection. 
            Depending on the number of reviews, this may take several minutes to complete.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={() => handleUserConfirmation(false)}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={() => handleUserConfirmation(true)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Proceed Box Component
  const ProceedBox = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-black mb-2">
        Ready to Analyze Emotions
      </h3>
      <p className="text-sm text-black mb-4">
        Click the button below when you're ready to start the emotion analysis process.
      </p>
      <button
        onClick={handleManualProceed}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Start Emotion Analysis
      </button>
    </div>
  );

  // Progress Bar Component
  const ProgressBar = () => (
    <div className="bg-gray-200 rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
          <svg className="h-8 w-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-black mb-2">
          Analyzing Emotions with AI
        </h3>
        <p className="text-black">
          {progressInfo?.stage || 'Processing...'}
        </p>
      </div>

      {progressInfo && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressInfo.progress || 0}%` }}
            ></div>
          </div>
          
          {/* Progress Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-black">Reviews</p>
              <p className="text-black">~{progressInfo.reviewCount?.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-black">Estimated Time</p>
              <p className="text-black">{progressInfo.estimatedTime}</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-black">Progress</p>
              <p className="text-black">{Math.round(progressInfo.progress || 0)}%</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Current Stage:</strong> {progressInfo.stage}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Loading component (fallback)
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">Loading...</p>
        <p className="text-sm text-gray-500">
          Preparing emotion analysis
        </p>
      </div>
    </div>
  );

  // Error component
  const ErrorDisplay = ({ error }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Error loading emotion analysis
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // No selection component
  const NoSelectionDisplay = () => (
    <div className="text-center py-12">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-black">No product selected</h3>
      <p className="mt-1 text-sm text-gray-500">
        Select a product to view emotion analysis data.
      </p>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-black">Opinion and Tone Analysis</h1>
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors outline-none"
                aria-label="Information about Opinion and Tone Analysis"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-gray-100 border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">About Opinion and Tone Analysis</h3>
                    <p className="text-base mb-3">
                      Advanced AI-powered emotion analysis dashboard. Features include:
                    </p>
                    <ul className="list-disc pl-5 mb-3 text-base space-y-1">
                      <li><strong>Positive Emotions:</strong> Analysis of admiration, approval, love, joy, optimism, and more</li>
                      <li><strong>Negative Emotions:</strong> Detection of disappointment, anger, sadness, fear, and other concerns</li>
                      <li><strong>Context-Dependent:</strong> Emotions that vary based on situational context</li>
                      <li><strong>Radar Overview:</strong> Top 6 emotions displayed in an interactive radar chart</li>
                      <li><strong>Emotion Flow:</strong> Sankey diagram showing how emotions flow through sentiment categories</li>
                    </ul>
                    <p className="text-base font-medium text-blue-700 mb-2">
                      <strong>How to Use:</strong>
                    </p>
                    <ol className="list-decimal pl-5 text-base space-y-1">
                      <li>Select a product from the sidebar</li>
                      <li>Click "Start Analysis" when prompted</li>
                      <li>Wait for AI processing to complete</li>
                      <li>Explore the emotion insights across different categories</li>
                    </ol>
                  </div>
                  {/* Arrow pointing up */}
                  <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-100 border-2 border-gray-300 border-r-0 border-b-0 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        <p className="text-lg text-black">
          AI-powered emotion detection and sentiment analysis for product reviews
        </p>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && <ConfirmationDialog />}

      {/* Main Content */}
      {!hasSelection ? (
        <NoSelectionDisplay />
      ) : showProceedBox ? (
        <ProceedBox />
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : isLoading && progressInfo ? (
        <ProgressBar />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : analysisInitiated && (positiveChartData || negativeChartData || contextChartData || radarData) ? (
        <>
          {/* Charts Container - 2 Rows Layout */}
          <div className="space-y-8">
            {/* First Row: Three Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Positive Emotions Bar Chart */}
              <div className="bg-gray-200 rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-black mb-2">{emotionCategories.positive.title}</h3>
                  <p className="text-xs text-gray-700">{emotionCategories.positive.description}</p>
                </div>
                <div className="h-[350px]">
                  {positiveChartData ? (
                    <Bar data={positiveChartData} options={{
                      ...barOptions,
                      plugins: {
                        ...barOptions.plugins,
                        title: {
                          display: true,
                          text: 'Positive Emotions in Reviews',
                          font: {
                            size: 14,
                            weight: 'bold'
                          }
                        }
                      }
                    }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p className="text-sm">No positive emotion data available</p>
                        <p className="text-xs mt-1">Select a product to view analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Negative Emotions Bar Chart */}
              <div className="bg-gray-200 rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-black mb-2">{emotionCategories.negative.title}</h3>
                  <p className="text-xs text-gray-700">{emotionCategories.negative.description}</p>
                </div>
                <div className="h-[350px]">
                  {negativeChartData ? (
                    <Bar data={negativeChartData} options={{
                      ...barOptions,
                      plugins: {
                        ...barOptions.plugins,
                        title: {
                          display: true,
                          text: 'Negative Emotions in Reviews',
                          font: {
                            size: 14,
                            weight: 'bold'
                          }
                        }
                      }
                    }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p className="text-sm">No negative emotion data available</p>
                        <p className="text-xs mt-1">Select a product to view analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Context-Dependent Emotions Bar Chart */}
              <div className="bg-gray-200 rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-black mb-2">{emotionCategories.contextDependent.title}</h3>
                  <p className="text-xs text-gray-700">{emotionCategories.contextDependent.description}</p>
                </div>
                <div className="h-[350px]">
                  {contextChartData ? (
                    <Bar data={contextChartData} options={{
                      ...barOptions,
                      plugins: {
                        ...barOptions.plugins,
                        title: {
                          display: true,
                          text: 'Context-Dependent Emotions in Reviews',
                          font: {
                            size: 14,
                            weight: 'bold'
                          }
                        }
                      }
                    }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p className="text-sm">No context-dependent emotion data available</p>
                        <p className="text-xs mt-1">Select a product to view analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Second Row: Sankey Chart and Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emotion Flow Sankey Chart */}
              <div className="bg-gray-200 rounded-lg shadow-lg p-8">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-black mb-2"> Emotion Sankey Flow Chart</h3>
                </div>
                
                <div className="h-[650px] w-full overflow-hidden">
                  {sankeyError ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-600">
                      <div className="text-center">
                        <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-lg">Sankey Chart Error</p>
                        <p className="text-sm mt-2">{sankeyError}</p>
                        <button 
                          onClick={() => setSankeyError(null)}
                          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : sankeyData ? (
                    <SankeyChart 
                      data={sankeyData}
                      width={750}
                      height={650}
                      className="w-full h-full"
                      onError={(error) => {
                        console.error('Sankey chart error:', error);
                        setSankeyError('Failed to render emotion flow chart');
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-lg">No emotion flow data available</p>
                        <p className="text-sm mt-2">Select a product to view emotion flow analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top 6 Emotions Radar Chart */}
              <div className="bg-gray-200 rounded-lg shadow-lg p-8">
                <div className="h-[650px] flex items-center justify-center">
                  {radarData && radarData.datasets && radarData.datasets.length > 0 ? (
                    <div className="w-full h-full">
                      <Radar data={radarData} options={radarOptions} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p className="text-lg">No emotion data available</p>
                        <p className="text-sm mt-2">Select a product to view analysis</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          </>
      ) : hasSelection && hasBeenPrompted && !analysisInitiated ? (
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-black mb-2">Ready for Analysis</h3>
          <p className="text-black mb-4">
            Emotion analysis is ready but hasn't been started yet.
          </p>
          <button
            onClick={handleManualProceed}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Analysis Now
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-black mb-2">Waiting for Product Selection</h3>
          <p className="text-black">
            Select a product to begin emotion analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default OpinionAndTone; 