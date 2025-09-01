import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Dashboard query keys factory
export const dashboardKeys = {
  all: ['dashboard'],
  comprehensive: (params) => ['dashboard', 'comprehensive', params],
  productComprehensive: (params) => ['dashboard', 'product-comprehensive', params],
  cacheStats: () => ['dashboard', 'cache', 'stats'],
  invalidate: (parentAsin) => ['dashboard', 'invalidate', parentAsin],
  warm: (parentAsin, params) => ['dashboard', 'warm', parentAsin, params]
};

// Main comprehensive dashboard hook
export const useComprehensiveDashboard = (params = {}) => {
  const { parentAsin, startDate, endDate, cities, enabled = true } = params;

  return useQuery({
    queryKey: dashboardKeys.comprehensive({
      parentAsin,
      startDate,
      endDate,
      cities
    }),
    queryFn: async () => {
      if (!parentAsin) {
        throw new Error('Parent ASIN is required for dashboard data');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('parent_asin', parentAsin);
      
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (cities) queryParams.append('cities', cities);

      const response = await axios.get(
        `/api/dashboard/comprehensive?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      return response.data;
    },
    enabled: enabled && !!parentAsin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Dashboard data fetch error:', error);
      
      // Handle specific error cases
      if (error?.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  });
};

// Product comprehensive dashboard hook - dedicated for ProductDashboard page
export const useProductComprehensiveDashboard = (params = {}) => {
  const { parentAsin, startDate, endDate, cities, enabled = true } = params;

  return useQuery({
    queryKey: dashboardKeys.productComprehensive({
      parentAsin,
      startDate,
      endDate,
      cities
    }),
    queryFn: async () => {
      console.log('Fetching product comprehensive dashboard data for:', parentAsin, 'with filters:', { startDate, endDate, cities });
      
      if (!parentAsin) {
        throw new Error('Parent ASIN is required for product dashboard data');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('parent_asin', parentAsin);
      
      // Only add date filters if both are provided (restrictive approach)
      if (startDate && endDate) {
        queryParams.append('start_date', startDate);
        queryParams.append('end_date', endDate);
        console.log('Applied date filters to API call:', startDate, 'to', endDate);
      } else if (startDate || endDate) {
        console.log('Date filters not applied: Both start and end dates are required');
      }
      
      if (cities) queryParams.append('cities', cities);

      const response = await axios.get(
        `/api/dashboard/product-comprehensive?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('Product dashboard API response:', response.data);
      return response.data;
    },
    enabled: enabled && !!parentAsin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Product dashboard data fetch error:', error);
      
      // Handle specific error cases
      if (error?.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  });
};

// Hook for cache statistics
export const useCacheStats = () => {
  return useQuery({
    queryKey: dashboardKeys.cacheStats(),
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/cache/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1
  });
};

// Hook for cache invalidation
export const useInvalidateCache = () => {
  const queryClient = useQueryClient();

  const invalidateProductCache = async (parentAsin) => {
    try {
      // Call backend invalidation endpoint
      await axios.get(`/api/dashboard/cache/invalidate/${parentAsin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Invalidate related queries in React Query cache
      await queryClient.invalidateQueries({
        queryKey: dashboardKeys.comprehensive({ parentAsin })
      });

      // Also invalidate any other product-specific queries
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return queryKey && queryKey.some(key => 
            typeof key === 'object' && key.parentAsin === parentAsin
          );
        }
      });

      return { success: true, parentAsin };
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw error;
    }
  };

  return { invalidateProductCache };
};

// Hook for cache warming
export const useWarmCache = () => {
  const warmProductCache = async (parentAsin, params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);

      const url = `/api/dashboard/cache/warm/${parentAsin}${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Cache warming error:', error);
      throw error;
    }
  };

  return { warmProductCache };
};

// Custom hook for dashboard loading states
export const useDashboardLoadingStates = (dashboardData) => {
  const isLoading = !dashboardData;
  const hasError = dashboardData?.error;
  const hasPartialData = dashboardData && !hasError;
  
  // Check which sections have data - supports both comprehensive and product-comprehensive formats
  const sectionsLoaded = {
    summaryStats: !!dashboardData?.summary_statistics,
    wordCloud: !!dashboardData?.word_cloud,
    timeline: !!dashboardData?.sentiment_timeline,
    yearlyDistribution: !!dashboardData?.yearly_distribution,
    monthlyDistribution: !!dashboardData?.monthly_distribution,
    sentimentMap: !!dashboardData?.sentiment_map,
    sentimentPie: !!dashboardData?.sentiment_pie, // New for ProductDashboard
    sentimentDistribution: !!dashboardData?.sentiment_distribution // Alternative for ProductDashboard
  };

  const totalSections = Object.keys(sectionsLoaded).length;
  const loadedSections = Object.values(sectionsLoaded).filter(Boolean).length;
  const loadingProgress = totalSections > 0 ? (loadedSections / totalSections) * 100 : 0;

  return {
    isLoading,
    hasError,
    hasPartialData,
    sectionsLoaded,
    loadingProgress,
    isComplete: loadedSections === totalSections
  };
};

// Custom hook for dashboard filters
export const useDashboardFilters = (initialFilters = {}) => {
  const [filters, setFilters] = React.useState({
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
    cities: initialFilters.cities || [],
    ...initialFilters
  });

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      cities: []
    });
  };

  const hasActiveFilters = () => {
    return filters.startDate || filters.endDate || filters.cities.length > 0;
  };

  // Format filters for API call
  const getApiFilters = () => {
    const apiFilters = {};
    
    if (filters.startDate) apiFilters.startDate = filters.startDate;
    if (filters.endDate) apiFilters.endDate = filters.endDate;
    if (filters.cities && filters.cities.length > 0) {
      apiFilters.cities = filters.cities.join(',');
    }
    
    return apiFilters;
  };

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    getApiFilters
  };
};

// Error boundary hook for dashboard
export const useDashboardErrorHandler = () => {
  const handleError = (error, errorInfo) => {
    console.error('Dashboard Error:', error, errorInfo);
    
    // Log to external service if needed
    // logErrorToService(error, errorInfo);
    
    // Show user-friendly error message
    const userMessage = getUserFriendlyErrorMessage(error);
    return userMessage;
  };

  const getUserFriendlyErrorMessage = (error) => {
    if (error?.response?.status === 401) {
      return 'Your session has expired. Please log in again.';
    } else if (error?.response?.status === 403) {
      return 'You do not have permission to access this dashboard.';
    } else if (error?.response?.status === 404) {
      return 'The requested product data was not found.';
    } else if (error?.response?.status >= 500) {
      return 'Server error occurred. Please try again later.';
    } else if (error?.code === 'NETWORK_ERROR') {
      return 'Network connection error. Please check your internet connection.';
    } else {
      return 'An unexpected error occurred. Please try refreshing the page.';
    }
  };

  return { handleError, getUserFriendlyErrorMessage };
};

// Performance monitoring hook
export const useDashboardPerformance = () => {
  const [performanceMetrics, setPerformanceMetrics] = React.useState({
    loadStartTime: null,
    loadEndTime: null,
    loadDuration: null,
    cacheHit: false
  });

  const startTiming = () => {
    setPerformanceMetrics(prev => ({
      ...prev,
      loadStartTime: performance.now(),
      loadEndTime: null,
      loadDuration: null
    }));
  };

  const endTiming = (cacheHit = false) => {
    const endTime = performance.now();
    setPerformanceMetrics(prev => ({
      ...prev,
      loadEndTime: endTime,
      loadDuration: prev.loadStartTime ? endTime - prev.loadStartTime : null,
      cacheHit
    }));
  };

  const getPerformanceReport = () => {
    const { loadDuration, cacheHit } = performanceMetrics;
    
    if (!loadDuration) return null;

    return {
      loadTime: Math.round(loadDuration),
      cacheHit,
      performance: loadDuration < 500 ? 'excellent' : 
                   loadDuration < 2000 ? 'good' : 
                   loadDuration < 5000 ? 'fair' : 'poor'
    };
  };

  return {
    performanceMetrics,
    startTiming,
    endTiming,
    getPerformanceReport
  };
};

// Export default hook for convenience
export default useComprehensiveDashboard;
