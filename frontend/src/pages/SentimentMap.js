import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import Card from '../components/ui/Card';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Function to get color based on sentiment score (-1 to 1 scale)
const getColor = (sentiment) => {
  if (sentiment >= 0.6) return '#22c55e'; // Very Positive (green)
  if (sentiment >= 0.2) return '#84cc16'; // Positive (light green)  
  if (sentiment >= -0.2) return '#f59e0b'; // Mixed (orange)
  if (sentiment >= -0.5) return '#ef4444'; // Negative (red)
  return '#dc2626'; // Very Negative (dark red)
};

// Function to get radius based on sentiment score (0-100 scale)
const getRadius = (score) => {
  return Math.max(8, Math.min(20, score / 3));
};

// Function to get sentiment label
const getSentimentLabel = (sentiment) => {
  if (sentiment >= 0.6) return 'Very Positive (80-100%)';
  if (sentiment >= 0.2) return 'Positive (60-79%)';
  if (sentiment >= -0.2) return 'Mixed (40-59%)';
  if (sentiment >= -0.5) return 'Negative (20-39%)';
  return 'Very Negative (0-19%)';
};

// Helper function for detailed view (using percentage)
const getSentimentLabelByScore = (score) => {
  if (score >= 80) return 'Very Positive';
  if (score >= 60) return 'Positive';
  if (score >= 40) return 'Mixed';
  if (score >= 20) return 'Negative';
  return 'Very Negative';
};

const SentimentMap = () => {
  const navigate = useNavigate();
  const [mapData, setMapData] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Start with false, will be set to true only when fetching
  const [error, setError] = useState(null);
  const [totalReviews, setTotalReviews] = useState(0);
  
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Summary dropdown state
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  
  // Get product selection context
  const { selectedProduct, hasSelection } = useProductSelection();

  // Handler for navigating to Product page
  const handleNavigateToProduct = () => {
    navigate('/product');
  };

  // Helper function to generate dynamic sentiment insights
  const generateSentimentMapInsights = () => {
    if (!mapData || mapData.length === 0 || totalReviews === 0) {
      return null;
    }

    // Calculate overall statistics
    const totalCities = mapData.length;
    const avgSentimentScore = mapData.reduce((sum, city) => sum + parseFloat(city.sentimentScore), 0) / totalCities;
    
    // Categorize cities by sentiment
    const positiveCities = mapData.filter(city => parseFloat(city.sentimentScore) >= 60);
    const neutralCities = mapData.filter(city => parseFloat(city.sentimentScore) >= 40 && parseFloat(city.sentimentScore) < 60);
    const negativeCities = mapData.filter(city => parseFloat(city.sentimentScore) < 40);
    
    // Find best and worst performing cities
    const bestCity = mapData.reduce((best, current) => 
      parseFloat(current.sentimentScore) > parseFloat(best.sentimentScore) ? current : best
    );
    const worstCity = mapData.reduce((worst, current) => 
      parseFloat(current.sentimentScore) < parseFloat(worst.sentimentScore) ? current : worst
    );
    
    // Calculate review distribution
    const totalCityReviews = mapData.reduce((sum, city) => sum + city.totalReviews, 0);
    const avgReviewsPerCity = totalCityReviews / totalCities;
    
    // Find cities with most and least reviews
    const mostReviewsCity = mapData.reduce((most, current) => 
      current.totalReviews > most.totalReviews ? current : most
    );
    const leastReviewsCity = mapData.reduce((least, current) => 
      current.totalReviews < least.totalReviews ? current : least
    );

    // Generate geographical distribution insight
    let geographicalInsight = `Geographical sentiment analysis across ${totalCities} UK cities reveals an average sentiment score of ${avgSentimentScore.toFixed(1)}%. `;
    
    if (avgSentimentScore >= 70) {
      geographicalInsight += `The overall geographical sentiment is strongly positive, indicating widespread customer satisfaction across UK locations. `;
    } else if (avgSentimentScore >= 50) {
      geographicalInsight += `The overall geographical sentiment is moderately positive, showing generally favorable customer experiences across UK regions. `;
    } else if (avgSentimentScore >= 30) {
      geographicalInsight += `The overall geographical sentiment is mixed, with varying customer experiences across different UK locations. `;
    } else {
      geographicalInsight += `The overall geographical sentiment is concerning, indicating widespread customer dissatisfaction across UK regions. `;
    }

    geographicalInsight += `${bestCity.name} leads with the highest sentiment score of ${bestCity.sentimentScore}%, while ${worstCity.name} shows the lowest at ${worstCity.sentimentScore}%.`;

    // Generate city performance insight
    let cityPerformanceInsight = `City performance analysis shows ${positiveCities.length} cities (${Math.round((positiveCities.length / totalCities) * 100)}%) with positive sentiment, `;
    cityPerformanceInsight += `${neutralCities.length} cities (${Math.round((neutralCities.length / totalCities) * 100)}%) with neutral sentiment, `;
    cityPerformanceInsight += `and ${negativeCities.length} cities (${Math.round((negativeCities.length / totalCities) * 100)}%) with negative sentiment. `;
    
    if (positiveCities.length > totalCities * 0.6) {
      cityPerformanceInsight += `The majority of UK cities demonstrate positive customer sentiment, indicating strong regional performance. `;
    } else if (negativeCities.length > totalCities * 0.4) {
      cityPerformanceInsight += `A significant number of cities show negative sentiment, suggesting regional performance issues that need attention. `;
    } else {
      cityPerformanceInsight += `Sentiment distribution across cities is balanced, showing mixed regional performance patterns. `;
    }

    cityPerformanceInsight += `${mostReviewsCity.name} has the highest review volume with ${mostReviewsCity.totalReviews.toLocaleString()} reviews, providing the most comprehensive sentiment data.`;

    // Generate review coverage insight
    let reviewCoverageInsight = `Review coverage analysis encompasses ${totalReviews.toLocaleString()} total reviews across ${totalCities} cities, `;
    reviewCoverageInsight += `averaging ${Math.round(avgReviewsPerCity).toLocaleString()} reviews per city. `;
    
    if (avgReviewsPerCity >= 1000) {
      reviewCoverageInsight += `The high review density provides statistically significant sentiment insights for reliable geographical analysis. `;
    } else if (avgReviewsPerCity >= 100) {
      reviewCoverageInsight += `The moderate review density offers good sentiment insights for geographical trend analysis. `;
    } else {
      reviewCoverageInsight += `The review density varies significantly across cities, with some locations having limited data for comprehensive analysis. `;
    }

    reviewCoverageInsight += `Review distribution ranges from ${leastReviewsCity.totalReviews.toLocaleString()} reviews in ${leastReviewsCity.name} to ${mostReviewsCity.totalReviews.toLocaleString()} reviews in ${mostReviewsCity.name}.`;

    return {
      geographicalInsight,
      cityPerformanceInsight,
      reviewCoverageInsight,
      summary: {
        totalCities,
        totalReviews,
        avgSentimentScore: avgSentimentScore.toFixed(1),
        positiveCities: positiveCities.length,
        neutralCities: neutralCities.length,
        negativeCities: negativeCities.length,
        bestCity: bestCity.name,
        worstCity: worstCity.name,
        bestScore: bestCity.sentimentScore,
        worstScore: worstCity.sentimentScore
      }
    };
  };

  // Fetch real sentiment map data
  const fetchSentimentMapData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching sentiment map data for product:', selectedProduct || 'all products');
      
      const params = selectedProduct ? { parent_asin: selectedProduct } : {};
      const response = await axios.get('/api/reviews/sentiment-map', {
        params,
        headers: getAuthHeaders()
      });
      
      console.log('Sentiment map API response:', response.data);
      
      if (response.data && response.data.cities) {
        setMapData(response.data.cities);
        setTotalReviews(response.data.total_reviews || 0);
        console.log(`Loaded sentiment data for ${response.data.cities.length} cities`);
      } else {
        setMapData([]);
        setTotalReviews(0);
        console.log('No city data received from API');
      }
      
    } catch (err) {
      console.error('Error fetching sentiment map data:', err);
      setError(err.response?.data?.detail || 'Failed to load sentiment map data');
      setMapData([]);
      setTotalReviews(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data when a product is selected
    if (selectedProduct) {
      fetchSentimentMapData();
    } else {
      // Reset data when no product is selected
      setMapData([]);
      setTotalReviews(0);
      setIsLoading(false);
      setError(null);
    }
  }, [selectedProduct]); // Refetch when selected product changes

  if (isLoading) {
    return (
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold text-black">Sentiment Map</h1>
          <div className="relative ml-3">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Information about Sentiment Map"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">About Sentiment Map</h3>
                  <p className="text-base">
                    Explore geographical patterns of customer sentiment across UK cities. This interactive map provides:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-base">
                    <li><strong>City Markers:</strong> Color-coded circles showing sentiment levels (green=positive, red=negative)</li>
                    <li><strong>Interactive Popups:</strong> Click markers to view detailed city statistics and sample reviews</li>
                    <li><strong>Sentiment Legend:</strong> Visual guide to understand sentiment color coding</li>
                    <li><strong>City Analysis:</strong> Comprehensive breakdown of positive, negative, and neutral sentiment percentages</li>
                  </ul>
                  <p className="text-base pt-2">
                    Select a product to analyze sentiment patterns across different UK locations and identify regional trends.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-300 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
        <div className="mb-6">
          <p className="text-lg text-black">
            Geographical visualization of customer sentiment across UK cities based on review analysis
          </p>
        </div>

        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-black">Loading sentiment map data...</p>
              {selectedProduct && (
                <p className="text-sm text-gray-600 mt-2">
                  Analyzing reviews for selected product...
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold text-black">Sentiment Map</h1>
          <div className="relative ml-3">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Information about Sentiment Map"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">About Sentiment Map</h3>
                  <p className="text-base">
                    Explore geographical patterns of customer sentiment across UK cities. This interactive map provides:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-base">
                    <li><strong>City Markers:</strong> Color-coded circles showing sentiment levels (green=positive, red=negative)</li>
                    <li><strong>Interactive Popups:</strong> Click markers to view detailed city statistics and sample reviews</li>
                    <li><strong>Sentiment Legend:</strong> Visual guide to understand sentiment color coding</li>
                    <li><strong>City Analysis:</strong> Comprehensive breakdown of positive, negative, and neutral sentiment percentages</li>
                  </ul>
                  <p className="text-base pt-2">
                    Select a product to analyze sentiment patterns across different UK locations and identify regional trends.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-300 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
        <div className="mb-6">
          <p className="text-lg text-black">
            Geographical visualization of customer sentiment across UK cities based on review analysis
          </p>
        </div>

        <div className="bg-red-50 rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Data</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchSentimentMapData}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mapData || mapData.length === 0) {
    return (
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold text-black">Sentiment Map</h1>
          <div className="relative ml-3">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Information about Sentiment Map"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">About Sentiment Map</h3>
                  <p className="text-base">
                    Explore geographical patterns of customer sentiment across UK cities. This interactive map provides:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-base">
                    <li><strong>City Markers:</strong> Color-coded circles showing sentiment levels (green=positive, red=negative)</li>
                    <li><strong>Interactive Popups:</strong> Click markers to view detailed city statistics and sample reviews</li>
                    <li><strong>Sentiment Legend:</strong> Visual guide to understand sentiment color coding</li>
                    <li><strong>City Analysis:</strong> Comprehensive breakdown of positive, negative, and neutral sentiment percentages</li>
                  </ul>
                  <p className="text-base pt-2">
                    Select a product to analyze sentiment patterns across different UK locations and identify regional trends.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-300 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
        <div className="mb-6">
          <p className="text-lg text-black">
            Geographical visualization of customer sentiment across UK cities based on review analysis
          </p>
        </div>

        {/* No Product Selected Message */}
        <Card>
          <div 
            className="text-center cursor-pointer hover:bg-gray-200 transition-colors rounded-lg p-2" 
            onClick={fetchSentimentMapData}
            style={{ padding: '32px 16px' }}
          >
            <h3 className="text-lg font-semibold text-black mb-2">No data available</h3>
            <p className="text-black">
              No reviews found with location data. Click to <strong>refresh</strong> and try again.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center mb-4">
        <h1 className="text-3xl font-bold text-black">Sentiment Map</h1>
        <div className="relative ml-3">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Information about Sentiment Map"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
              <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">About Sentiment Map</h3>
                <p className="text-base">
                  Explore geographical patterns of customer sentiment across UK cities. This interactive map provides:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-base">
                  <li><strong>City Markers:</strong> Color-coded circles showing sentiment levels (green=positive, red=negative)</li>
                  <li><strong>Interactive Popups:</strong> Click markers to view detailed city statistics and sample reviews</li>
                  <li><strong>Sentiment Legend:</strong> Visual guide to understand sentiment color coding</li>
                  <li><strong>City Analysis:</strong> Comprehensive breakdown of positive, negative, and neutral sentiment percentages</li>
                </ul>
                <p className="text-base pt-2">
                  Select a product to analyze sentiment patterns across different UK locations and identify regional trends.
                </p>
              </div>
              {/* Arrow pointing up */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-300 rotate-45"></div>
            </div>
          )}
        </div>
      </div>
      <div className="mb-6">
        <p className="text-lg text-black">
          Geographical visualization of customer sentiment across UK cities based on review analysis
        </p>
      </div>

      {/* Dynamic Insights Summary */}
      {hasSelection && !isLoading && !error && mapData && mapData.length > 0 && (() => {
        const insights = generateSentimentMapInsights();
        if (!insights) return null;

        return (
          <Card title="Geographical Sentiment Analysis Summary">
            <div className="border border-gray-200 rounded-lg">
              {/* Summary Header - Clickable */}
              <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border-b border-gray-200 rounded-t-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-blue-900">
                        Click to {summaryExpanded ? 'hide' : 'view'} detailed geographical sentiment insights
                      </h4>
                      <p className="text-xs text-blue-700 mt-1">
                        City performance, geographical distribution, and review coverage analysis
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg 
                      className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${summaryExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expandable Content */}
              {summaryExpanded && (
                <div className="p-4 space-y-6 bg-white">
                  {/* Geographical Distribution Analysis */}
                  <div style={styles.insightSection}>
                    <div style={styles.insightHeader}>
                      <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                      <h5 style={styles.insightTitle}>Geographical Distribution Analysis</h5>
                    </div>
                    <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                      <ul style={styles.insightList}>
                        <li style={styles.insightListItem}>
                          <span style={styles.insightBullet}>•</span>
                          <span style={styles.insightText}>{insights.geographicalInsight}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* City Performance Analysis */}
                  <div style={styles.insightSection}>
                    <div style={styles.insightHeader}>
                      <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                      <h5 style={styles.insightTitle}>City Performance Analysis</h5>
                    </div>
                    <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                      <ul style={styles.insightList}>
                        <li style={styles.insightListItem}>
                          <span style={styles.insightBullet}>•</span>
                          <span style={styles.insightText}>{insights.cityPerformanceInsight}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Review Coverage Analysis */}
                  <div style={styles.insightSection}>
                    <div style={styles.insightHeader}>
                      <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                      <h5 style={styles.insightTitle}>Review Coverage Analysis</h5>
                    </div>
                    <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                      <ul style={styles.insightList}>
                        <li style={styles.insightListItem}>
                          <span style={styles.insightBullet}>•</span>
                          <span style={styles.insightText}>{insights.reviewCoverageInsight}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* No Product Selected Message */}
      {!hasSelection && (
        <Card>
          <div 
            className="text-center cursor-pointer hover:bg-gray-200 transition-colors rounded-lg p-2" 
            onClick={handleNavigateToProduct}
            style={{ padding: '32px 16px' }}
          >
            <h3 className="text-lg font-semibold text-black mb-2">No product selected</h3>
            <p className="text-black">
              Go to the <strong>Product</strong> page to select a product for sentiment map analysis.
            </p>
          </div>
        </Card>
      )}

      {/* Content when product is selected */}
      {hasSelection && (
        <>

      {/* Main Map Visualization */}
      <Card title="UK Cities Sentiment Heatmap" subtitle="Interactive map showing sentiment distribution across UK cities">

        <div className="space-y-4">
          <p className="text-sm text-black">
            Click on any city marker to view detailed sentiment analysis and sample reviews
          </p>
          
          
          {/* Interactive Map */}
          <div className="bg-gray-200 rounded-lg p-4 border border-gray-200">
            <MapContainer
              center={[54.5, -4]}
              zoom={6}
              style={{ height: '500px', width: '100%' }}
              className="z-0 rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {mapData.map((city, index) => (
                <CircleMarker
                  key={index}
                  center={[city.lat, city.lng]}
                  radius={getRadius(city.score)}
                  fillColor={getColor(city.sentiment)}
                  color={getColor(city.sentiment)}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                  eventHandlers={{
                    click: () => setSelectedCity(city)
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-bold text-lg">{city.name}</h3>
                      <p className="text-sm">Score: {city.score}%</p>
                      <p className="text-sm">Sentiment: {city.sentiment.toFixed(2)}</p>
                      <p className="text-xs text-black">{getSentimentLabel(city.sentiment)}</p>
                      <p className="text-xs text-gray-500 mt-1">Total Reviews: {city.totalReviews.toLocaleString()}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="flex justify-center space-x-6 text-sm">
            {[
              { color: '#22c55e', label: 'Very Positive (80-100%)' },
              { color: '#84cc16', label: 'Positive (60-79%)' },
              { color: '#f59e0b', label: 'Mixed (40-59%)' },
              { color: '#ef4444', label: 'Negative (20-39%)' },
              { color: '#dc2626', label: 'Very Negative (0-19%)' }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
          
          {/* Instructions */}
          <div className="text-center text-sm text-black space-y-1">
            <div>Click on any city marker to view detailed sentiment breakdown and sample reviews.</div>
            <div className="text-blue-600 font-medium">
              {totalReviews.toLocaleString()} total reviews analyzed across {mapData.length} UK cities
            </div>
          </div>
        </div>
      </Card>

      {/* City Details Panel */}
      {selectedCity && (
        <Card title={`${selectedCity.name} - Detailed Analysis`} subtitle="Comprehensive sentiment breakdown and sample reviews">
          <div className="space-y-6">
            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedCity(null)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* City Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm bg-gray-200 rounded-lg p-4">
              <div className="text-center">
                <div className="font-semibold text-black">Total Reviews</div>
                <div className="text-2xl font-bold text-blue-600">{selectedCity.totalReviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Avg: {selectedCity.avgRating}/5.0</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-black">Positive Reviews</div>
                <div className="text-2xl font-bold text-green-600">{selectedCity.positiveReviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">{selectedCity.positivePercentage}%</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-black">Neutral Reviews</div>
                <div className="text-2xl font-bold text-gray-600">{selectedCity.neutralReviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">{selectedCity.neutralPercentage}%</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-black">Negative Reviews</div>
                <div className="text-2xl font-bold text-red-600">{selectedCity.negativeReviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">{selectedCity.negativePercentage}%</div>
              </div>
            </div>

            {/* Sample Reviews */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black">Sample Reviews</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Showing {selectedCity.reviews?.length || 0} of {selectedCity.totalReviews.toLocaleString()} reviews
                </span>
              </div>
              
              {selectedCity.reviews && selectedCity.reviews.length > 0 ? (
                <div className="bg-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCity.reviews.map((review, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.floor(review.rating) ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              review.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                              review.sentiment === 'neutral' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {review.sentiment}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{review.rating}/5</span>
                        </div>
                        <p className="text-sm text-gray-700">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-black">No sample reviews available for this city.</div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
        </>
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

export default SentimentMap;