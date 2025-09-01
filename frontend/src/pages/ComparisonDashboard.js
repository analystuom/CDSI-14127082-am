import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import { useProductsByCategory, useComparisonDashboardData } from '../hooks/useComparisonQueries';
import ComparisonDropdown from '../components/comparison/ComparisonDropdown';
import SentimentDistributionComparison from '../components/comparison/SentimentDistributionComparison';
import PositiveSentimentTimeline from '../components/comparison/PositiveSentimentTimeline';
import NegativeSentimentTimeline from '../components/comparison/NegativeSentimentTimeline';
import PositiveReviewsScatter from '../components/comparison/PositiveReviewsScatter';
import NegativeReviewsScatter from '../components/comparison/NegativeReviewsScatter';
import SentimentPieCharts from '../components/comparison/SentimentPieCharts';



// Loading skeleton component
const LoadingSkeleton = ({ className = "h-4 bg-gray-200 rounded animate-pulse" }) => (
  <div className={className}></div>
);

// Filter component - Dropdown style (similar to ProductDashboard)
const ComparisonFilters = ({ filters, updateFilter, clearFilters, hasActiveFilters, onApplyFilters, appliedFilters, hasActiveAppliedFilters }) => {
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

// Products Selection component - Integrated with ProductSelectionContext
const ProductsSelection = ({ 
  selectedProduct, 
  comparisonProduct1, 
  comparisonProduct2, 
  updateComparisonProduct1, 
  updateComparisonProduct2,
  categoryProducts,
  isLoadingCategory,
  categoryError,
  getComparisonProducts
}) => {
  const [showProducts, setShowProducts] = useState(false);
  const allSelectedProducts = getComparisonProducts();

  return (
    <div className="relative">
      {/* Compact Products Selection Bar */}
      <div className="flex items-center justify-between bg-gray-200 border border-gray-400 rounded-xl px-4 py-3 shadow-lg">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-black">Products Selection</h3>
          
          {/* Selected Products Summary */}
          {allSelectedProducts.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Selected:</span>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {allSelectedProducts.length} Products
                </span>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setShowProducts(!showProducts)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
        >
          <svg className={`w-4 h-4 transition-transform ${showProducts ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showProducts ? 'Hide Products' : 'Select Products'}
        </button>
      </div>

      {/* Dropdown Panel */}
      {showProducts && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose up to 2 additional products from the same category to compare with your primary product.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ComparisonDropdown
                label="Comparison Product 1"
                selectedProductId={comparisonProduct1}
                onSelectionChange={updateComparisonProduct1}
                availableProducts={categoryProducts}
                isLoading={isLoadingCategory}
                placeholder="Select first comparison product"
              />
              
              <ComparisonDropdown
                label="Comparison Product 2"
                selectedProductId={comparisonProduct2}
                onSelectionChange={updateComparisonProduct2}
                availableProducts={categoryProducts}
                isLoading={isLoadingCategory}
                placeholder="Select second comparison product"
              />
            </div>
            
            {categoryError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <strong>Error:</strong> Failed to load comparable products. Please try again.
              </div>
            )}
            
            {!isLoadingCategory && categoryProducts.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
                <p className="font-medium">No comparable products found</p>
                <p className="text-sm mt-1">
                  There are no other products in the same category as your selected product.
                </p>
              </div>
            )}

            {/* Selected Products Summary */}
            {allSelectedProducts.length > 1 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">
                    Comparison selections saved - {allSelectedProducts.length} products selected
                  </span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Your selections will persist when navigating between pages
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ComparisonDashboard = () => {
  const { isAdmin } = useAuth();
  const { 
    selectedProduct, 
    hasSelection, 
    comparisonProduct1,
    comparisonProduct2,
    updateComparisonProduct1,
    updateComparisonProduct2,
    getComparisonProducts,
    getSelectedProductTitle
  } = useProductSelection();
  
  // Tooltip state for page header
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Filters state (similar to ProductDashboard)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  // Applied filters state (only updates when Apply button is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: ''
  });

  // Fetch products from the same category as the primary product
  const {
    data: categoryProducts = [],
    isLoading: isLoadingCategory,
    error: categoryError
  } = useProductsByCategory(selectedProduct);

  // Get all selected products (primary + comparison products)
  const allSelectedProducts = getComparisonProducts();

  // Fetch comprehensive comparison dashboard data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    isSuccess: isDashboardSuccess
  } = useComparisonDashboardData(allSelectedProducts, appliedFilters);

  // Filter management functions
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: ''
    });
    setAppliedFilters({
      startDate: '',
      endDate: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.startDate || filters.endDate;
  };

  const hasActiveAppliedFilters = () => {
    return appliedFilters.startDate || appliedFilters.endDate;
  };

  const handleApplyFilters = () => {
    // Only apply date filters if BOTH start and end dates are provided
    const newAppliedFilters = {};
    
    if (filters.startDate && filters.endDate) {
      newAppliedFilters.startDate = filters.startDate;
      newAppliedFilters.endDate = filters.endDate;
      console.log('Applied date filters:', newAppliedFilters);
    } else if (filters.startDate || filters.endDate) {
      console.log('Date filters not applied: Both start and end dates are required');
    }
    
    setAppliedFilters(newAppliedFilters);
  };

  // Debug logging for comparison selections persistence (similar to ProductComparison)
  useEffect(() => {
    if (comparisonProduct1 || comparisonProduct2) {
      console.log('Comparison selections loaded in ComparisonDashboard:', {
        primary: selectedProduct,
        comparison1: comparisonProduct1,
        comparison2: comparisonProduct2,
        total: allSelectedProducts.length
      });
    }
  }, [comparisonProduct1, comparisonProduct2, selectedProduct, allSelectedProducts.length]);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-black">Comparison Dashboard</h1>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors outline-none"
              aria-label="Information about Comparison Dashboard"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-gray-100 border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
                <div className="text-sm text-gray-700 leading-relaxed">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">About Comparison Dashboard</h3>
                  <p className="text-base mb-3">
                    Advanced product comparison analytics dashboard. Features include:
                  </p>
                  <ul className="list-disc pl-5 mb-3 text-base space-y-1">
                    <li><strong>Multi-Product Selection:</strong> Compare up to 4 products simultaneously</li>
                    <li><strong>Comparative Visualizations:</strong> Side-by-side sentiment analysis</li>
                    <li><strong>Advanced Filters:</strong> Date range and city-based filtering</li>
                    <li><strong>Trend Comparisons:</strong> Analyze performance differences over time</li>
                    <li><strong>Geographic Analysis:</strong> Compare regional sentiment patterns</li>
                  </ul>
                  <p className="text-base font-medium text-blue-700">
                    <strong>Professional Access:</strong> This dashboard requires administrator privileges and professional user workspace.
                  </p>
                </div>
                {/* Arrow pointing up */}
                <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-100 border-2 border-gray-300 border-r-0 border-b-0 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
        <p className="text-lg text-black">
          Compare multiple products with advanced analytics and visualizations
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
              This dashboard is only available to administrators with professional user workspace. Please contact your system administrator for access.
            </p>
          </div>
        </Card>
      )}

      {/* Primary Product Selection Check */}
      {isAdmin && !hasSelection && (
        <Card>
          <div className="text-center py-8">
            <div className="text-yellow-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-yellow-600 mb-2">No Primary Product Selected</h3>
            <p className="text-gray-600 mb-4">
              Please select a primary product from the Product Selection page to enable comparison dashboard functionality.
            </p>
            <button
              onClick={() => window.location.href = '/product'}
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
          <ComparisonFilters
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            onApplyFilters={handleApplyFilters}
            appliedFilters={appliedFilters}
            hasActiveAppliedFilters={hasActiveAppliedFilters}
          />

          {/* Products Selection Section */}
          <ProductsSelection
            selectedProduct={selectedProduct}
            comparisonProduct1={comparisonProduct1}
            comparisonProduct2={comparisonProduct2}
            updateComparisonProduct1={updateComparisonProduct1}
            updateComparisonProduct2={updateComparisonProduct2}
            categoryProducts={categoryProducts}
            isLoadingCategory={isLoadingCategory}
            categoryError={categoryError}
            getComparisonProducts={getComparisonProducts}
          />

          {/* Products Selection Validation */}
          {allSelectedProducts.length < 2 && (
            <Card>
              <div className="text-center py-8">
                <div className="text-yellow-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-yellow-600 mb-2">Select Products to Compare</h3>
                <p className="text-gray-600 mb-4">
                  Please select at least 1 additional product from the Products Selection panel above to enable comparison visualizations.
                </p>
              </div>
            </Card>
          )}

          {/* Comparison Visualizations */}
          {allSelectedProducts.length >= 2 && (
            <div className="space-y-6">
              {/* Top Row - Sentiment Pie Charts Overview */}
              <SentimentPieCharts
                comparisonData={dashboardData?.basic_comparison || []}
                isLoading={isDashboardLoading}
                error={dashboardError}
              />

              {/* Main Visualizations - 2x2 Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Left - Positive Sentiment Timeline */}
                <PositiveSentimentTimeline
                  timelineData={dashboardData?.timeline_data || []}
                  selectedProductIds={allSelectedProducts}
                  isLoading={isDashboardLoading}
                  error={dashboardError}
                />

                {/* Top Right - Positive Reviews vs Total Reviews Scatter */}
                <PositiveReviewsScatter
                  scatterData={dashboardData?.scatter_data || []}
                  selectedProductIds={allSelectedProducts}
                  isLoading={isDashboardLoading}
                  error={dashboardError}
                />

                {/* Bottom Left - Negative Sentiment Timeline */}
                <NegativeSentimentTimeline
                  timelineData={dashboardData?.timeline_data || []}
                  selectedProductIds={allSelectedProducts}
                  isLoading={isDashboardLoading}
                  error={dashboardError}
                />

                {/* Bottom Right - Negative Reviews vs Total Reviews Scatter */}
                <NegativeReviewsScatter
                  scatterData={dashboardData?.scatter_data || []}
                  selectedProductIds={allSelectedProducts}
                  isLoading={isDashboardLoading}
                  error={dashboardError}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ComparisonDashboard;
