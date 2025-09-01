import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import { useProductComprehensiveDashboard, useDashboardFilters, useDashboardLoadingStates } from '../hooks/useDashboardQueries';
import DashboardWordCloud from '../components/DashboardWordCloud';
import DashboardSentimentLine from '../components/DashboardSentimentLine';
import DashboardSentimentArea from '../components/DashboardSentimentArea';
import DashboardSentimentDistribution from '../components/DashboardSentimentDistribution';
import DashboardSentimentMap from '../components/DashboardSentimentMap';
import DashboardSentimentPieChart from '../components/DashboardSentimentPieChart';



// Loading skeleton component
const LoadingSkeleton = ({ className = "h-4 bg-gray-200 rounded animate-pulse" }) => (
  <div className={className}></div>
);

// Summary statistics card component
const SummaryStatsCard = ({ title, value, percentage, trend, color, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="text-center">
        <LoadingSkeleton className="h-8 w-16 mx-auto mb-2" />
        <LoadingSkeleton className="h-4 w-24 mx-auto mb-1" />
        <LoadingSkeleton className="h-3 w-16 mx-auto" />
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <div className={`text-3xl font-bold mb-2 ${color}`}>
        {value?.toLocaleString() || 0}
      </div>
      <div className="text-sm font-medium text-gray-700 mb-1">{title}</div>
      <div className="text-xs text-gray-500">
        {percentage}% of total
        {trend && (
          <span className={`ml-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↗' : '↘'}
          </span>
        )}
      </div>
    </Card>
  );
};

// Filter component - Dropdown style
const DashboardFilters = ({ filters, updateFilter, clearFilters, hasActiveFilters, onApplyFilters, appliedFilters, hasActiveAppliedFilters }) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="relative">
      {/* Compact Filter Bar */}
      <div className="flex items-center justify-between bg-gray-200 border border-gray-400 rounded-xl px-4 py-3 shadow-lg">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-black">Filters</h3>
          
          {/* Active Filters Summary */}
          {hasActiveAppliedFilters && hasActiveAppliedFilters() && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Active:</span>
              <div className="flex gap-1">
                {appliedFilters && appliedFilters.startDate && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Date Range
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Dropdown Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-3">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>



            {/* Filter Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={onApplyFilters}
                className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Apply Filters
              </button>
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Pending Filters Display */}
            {hasActiveFilters() && !hasActiveAppliedFilters() && (
              <div className="p-2 bg-yellow-50 rounded border-t border-gray-200">
                <h4 className="text-xs font-medium text-yellow-800 mb-1">Pending Changes:</h4>
                <div className="flex flex-wrap gap-1">
                  {filters.startDate && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                      From: {filters.startDate}
                    </span>
                  )}
                  {filters.endDate && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                      To: {filters.endDate}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProductDashboard = () => {
  const { isAdmin } = useAuth();
  const { selectedProduct, hasSelection, getSelectedProductTitle } = useProductSelection();
  
  // Tooltip state for page header
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Dashboard filters (for UI inputs)
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    getApiFilters
  } = useDashboardFilters();

  // Applied filters state (only updates when Apply button is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: ''
  });

  // Dashboard data query (uses applied filters) - now using dedicated ProductDashboard endpoint
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useProductComprehensiveDashboard({
    parentAsin: selectedProduct,
    enabled: !!selectedProduct && isAdmin,
    ...appliedFilters
  });

  // Loading states
  const {
    isLoading,
    hasError,
    hasPartialData,
    sectionsLoaded,
    loadingProgress,
    isComplete
  } = useDashboardLoadingStates(dashboardData);

  // Handle filter application - now updates appliedFilters state
  const handleApplyFilters = () => {
    if (selectedProduct) {
      const currentFilters = getApiFilters();
      
      // Only apply date filters if BOTH start and end dates are provided
      const newAppliedFilters = {};
      
      if (currentFilters.startDate && currentFilters.endDate) {
        newAppliedFilters.startDate = currentFilters.startDate;
        newAppliedFilters.endDate = currentFilters.endDate;
        console.log('Applied date filters:', newAppliedFilters);
      } else if (currentFilters.startDate || currentFilters.endDate) {
        console.log('Date filters not applied: Both start and end dates are required');
      }
      
      setAppliedFilters(newAppliedFilters);
    }
  };

  // Handle filter clearing - also clears applied filters
  const handleClearFilters = () => {
    clearFilters();
    setAppliedFilters({
      startDate: '',
      endDate: ''
    });
  };

  // Check if there are active applied filters
  const hasActiveAppliedFilters = () => {
    return appliedFilters.startDate || appliedFilters.endDate;
  };

  // Memoized summary statistics
  const summaryStats = useMemo(() => {
    if (!dashboardData?.summary_statistics) return null;
    
    const stats = dashboardData.summary_statistics;
    return {
      total: stats.total_reviews || 0,
      positive: stats.positive_reviews || 0,
      neutral: stats.neutral_reviews || 0,
      negative: stats.negative_reviews || 0,
      positivePercentage: stats.positive_percentage || 0,
      neutralPercentage: stats.neutral_percentage || 0,
      negativePercentage: stats.negative_percentage || 0
    };
  }, [dashboardData?.summary_statistics]);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-black">Product Dashboard</h1>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors outline-none"
              aria-label="Information about Product Dashboard"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-gray-100 border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                <div className="text-sm text-gray-700 leading-relaxed">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">About Product Dashboard</h3>
                  <p className="text-base mb-3">
                    Comprehensive product analytics dashboard. Features include:
                  </p>
                  <ul className="list-disc pl-5 mb-3 text-base space-y-1">
                    <li><strong>Summary Statistics:</strong> Total, positive, negative, and neutral review counts</li>
                    <li><strong>Word Cloud:</strong> Most frequently mentioned qualitative words</li>
                    <li><strong>Sentiment Timeline:</strong> Monthly sentiment trends over time</li>
                    <li><strong>Distribution Charts:</strong> Yearly and monthly sentiment breakdowns</li>
                    <li><strong>Sentiment Map:</strong> Geographic sentiment distribution across UK cities</li>
                    <li><strong>Advanced Filters:</strong> Date range and city-based filtering</li>
                  </ul>
                  <p className="text-base font-medium text-blue-700">
                    <strong>Admin Access:</strong> This dashboard requires administrator privileges and a selected product.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-100 border-2 border-gray-300 border-r-0 border-b-0 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
        <p className="text-lg text-black">
          Comprehensive product analytics dashboard
          {selectedProduct && (
            <span className="ml-2 text-blue-600 font-medium">
              - {getSelectedProductTitle()}
            </span>
          )}
        </p>
      </div>

      {/* Admin Access Check */}
      {!isAdmin && (
        <Card>
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Access Restricted</h3>
            <p className="text-gray-600">
              This dashboard is only available to administrators. Please contact your system administrator for access.
            </p>
          </div>
        </Card>
      )}

      {/* Product Selection Check */}
      {isAdmin && !hasSelection && (
        <Card>
          <div className="text-center py-8">
            <div className="text-yellow-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-yellow-600 mb-2">No Product Selected</h3>
            <p className="text-gray-600 mb-4">
              Please select a product from the Product Selection page to view dashboard analytics.
            </p>
            <button
              onClick={() => window.location.href = '/starting'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go to Product Selection
            </button>
          </div>
        </Card>
      )}

      {/* Dashboard Content - Only show for admin users with selected product */}
      {isAdmin && hasSelection && (
        <>
          {/* Filters Section */}
          <DashboardFilters
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            onApplyFilters={handleApplyFilters}
            appliedFilters={appliedFilters}
            hasActiveAppliedFilters={hasActiveAppliedFilters}
          />

          {/* Loading Progress */}
          {isLoading && (
            <Card>
              <div className="text-center py-4">
                <div className="text-blue-600 mb-2">
                  <svg className="w-8 h-8 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Loading dashboard data...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{Math.round(loadingProgress)}% complete</p>
              </div>
            </Card>
          )}

          {/* Error Display */}
          {hasError && (
            <Card>
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-red-600 mb-2">Error Loading Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  {dashboardError?.message || 'An unexpected error occurred while loading the dashboard.'}
                </p>
                <button
                  onClick={() => refetchDashboard()}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </Card>
          )}

          {/* Summary Statistics Cards */}
          {(summaryStats || isLoading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryStatsCard
                title="Total Reviews"
                value={summaryStats?.total}
                percentage={100}
                color="text-blue-600"
                isLoading={isLoading}
              />
              <SummaryStatsCard
                title="Positive Reviews"
                value={summaryStats?.positive}
                percentage={summaryStats?.positivePercentage}
                color="text-green-600"
                isLoading={isLoading}
              />
              <SummaryStatsCard
                title="Neutral Reviews"
                value={summaryStats?.neutral}
                percentage={summaryStats?.neutralPercentage}
                color="text-yellow-600"
                isLoading={isLoading}
              />
              <SummaryStatsCard
                title="Negative Reviews"
                value={summaryStats?.negative}
                percentage={summaryStats?.negativePercentage}
                color="text-red-600"
                isLoading={isLoading}
              />
            </div>
          )}

                    {/* Core Visualizations - 9-Box Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Row 1: Sentiment Timeline (2 boxes) + Pie Chart (1 box) */}
            <div className="lg:col-span-2 bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
              <DashboardSentimentLine 
                timelineData={dashboardData?.sentiment_timeline}
                isLoading={isDashboardLoading}
                error={dashboardError}
              />
            </div>

            <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
              <DashboardSentimentPieChart 
                sentimentData={dashboardData?.sentiment_pie}
                isLoading={isDashboardLoading}
                error={dashboardError}
              />
            </div>

            {/* Row 2: Sentiment Area Chart (2 boxes) + Word Cloud (1 box) */}
            <div className="lg:col-span-2 bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
              <DashboardSentimentArea 
                timelineData={dashboardData?.sentiment_timeline}
                isLoading={isDashboardLoading}
                error={dashboardError}
              />
            </div>

            <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
              <DashboardWordCloud 
                selectedProduct={selectedProduct}
              />
            </div>

            {/* Row 3: Sentiment Distribution Bar Chart (2 boxes) + Geographic Sentiment (1 box) */}
            <div className="lg:col-span-2 bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
              <DashboardSentimentDistribution 
                selectedProduct={selectedProduct}
                filters={appliedFilters}
              />
            </div>

            <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
              <DashboardSentimentMap 
                selectedProduct={selectedProduct}
              />
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default ProductDashboard;
