import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Function to get color based on sentiment score (-1 to 1 scale) - EXACT same logic as SentimentMap.js
const getColor = (sentiment) => {
  if (sentiment >= 0.6) return '#22c55e'; // Very Positive (green)
  if (sentiment >= 0.2) return '#84cc16'; // Positive (light green)  
  if (sentiment >= -0.2) return '#f59e0b'; // Mixed (orange)
  if (sentiment >= -0.5) return '#ef4444'; // Negative (red)
  return '#dc2626'; // Very Negative (dark red)
};

// Function to get radius based on sentiment score (0-100 scale) - EXACT same logic as SentimentMap.js
const getRadius = (score) => {
  return Math.max(8, Math.min(20, score / 3));
};

// Function to get sentiment label - EXACT same logic as SentimentMap.js
const getSentimentLabel = (sentiment) => {
  if (sentiment >= 0.6) return 'Very Positive (80-100%)';
  if (sentiment >= 0.2) return 'Positive (60-80%)';
  if (sentiment >= -0.2) return 'Mixed (40-60%)';
  if (sentiment >= -0.5) return 'Negative (20-40%)';
  return 'Very Negative (0-20%)';
};

const DashboardSentimentMap = ({ selectedProduct }) => {
  // Use individual API call (no date filters needed)
  const [mapData, setMapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sentiment map data
  useEffect(() => {
    const fetchMapData = async () => {
      if (!selectedProduct) {
        setMapData(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching sentiment map data for:', selectedProduct);
        
        const response = await axios.get('/api/reviews/sentiment-map', {
          params: {
            parent_asin: selectedProduct
          },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        console.log('Sentiment map API response:', response.data);
        console.log('Cities data structure:', response.data?.cities?.slice(0, 2)); // Log first 2 cities for debugging
        setMapData(response.data);
      } catch (err) {
        console.error('Error fetching sentiment map data:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, [selectedProduct]);

  // Extract cities and total reviews from mapData
  const cities = mapData?.cities || [];
  const totalReviews = mapData?.total_reviews || 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-black">Geographic Sentiment</h3>
          <p className="text-sm text-black">Sentiment distribution across UK cities</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-600 text-sm">Loading map data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-black">Geographic Sentiment</h3>
          <p className="text-sm text-black">Sentiment distribution across UK cities</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-red-400 mb-2">⚠️</div>
            <p className="text-red-500 text-sm">Error loading map data</p>
            <p className="text-gray-500 text-xs mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!cities || cities.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-black">Geographic Sentiment</h3>
          <p className="text-sm text-black">Sentiment distribution across UK cities</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-gray-400 mb-2">🗺️</div>
            <p className="text-gray-500 text-sm">No geographic data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-black">Geographic Sentiment</h3>
        <p className="text-sm text-black">Sentiment distribution across UK cities</p>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <MapContainer
          center={[54.5, -2.0]} // Center of UK
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {cities.map((city, index) => (
            <CircleMarker
              key={`${city.name || 'unknown'}-${index}`}
              center={[city.lat || 54.5, city.lng || -2.0]}
              radius={getRadius(city.sentimentScore || 0)}
              fillColor={getColor(city.sentiment || 0)}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-lg mb-2">{city.name || 'Unknown City'}</div>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Sentiment:</span> {getSentimentLabel(city.sentiment || 0)}
                    </div>
                    <div>
                      <span className="font-medium">Score:</span> {(city.sentimentScore || 0).toFixed(1)}%
                    </div>
                    <div>
                      <span className="font-medium">Reviews:</span> {city.totalReviews || 0}
                    </div>
                    <div>
                      <span className="font-medium">Avg Rating:</span> {(city.avgRating || 0).toFixed(1)}/5
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>


    </div>
  );
};

export default DashboardSentimentMap;