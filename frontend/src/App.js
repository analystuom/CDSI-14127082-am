import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import DashboardLayout from './components/layout/DashboardLayout';

import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

import Guest from './pages/Guest';
import Starting from './pages/Starting';
import StartingProfessional from './pages/StartingProfessional';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import ProductDashboard from './pages/ProductDashboard';
import ComparisonDashboard from './pages/ComparisonDashboard';
import WordCloud from './pages/WordCloud';
import SentimentTimeline from './pages/SentimentTimeline';
import ProductComparison from './pages/ProductComparison';
import SentimentHexagon from './pages/SentimentHexagon';
import OpinionAndTone from './pages/OpinionAndTone';
import SentimentMap from './pages/SentimentMap';
import Product from './pages/Product';
import UserFeedback from './pages/UserFeedback';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-black">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Guest />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route 
          path="/gettingstart" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Starting />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/gettingstartprofessional" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StartingProfessional />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/product" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Product />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/wordcloud" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WordCloud />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/productcomparison" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProductComparison />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />        

        <Route 
          path="/sentimenttimeline" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SentimentTimeline />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/sentimenthexagon" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SentimentHexagon />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/opinionandtone" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <OpinionAndTone />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/sentimentmap" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SentimentMap />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />        

        <Route 
          path="/feedback" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UserFeedback />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute adminOnly={true}>
              <DashboardLayout>
                <Admin />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/productdashboard" 
          element={
            <ProtectedRoute adminOnly={true}>
              <DashboardLayout>
                <ProductDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/comparisondashboard" 
          element={
            <ProtectedRoute adminOnly={true}>
              <DashboardLayout>
                <ComparisonDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;