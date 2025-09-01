import { useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export const sentimentKeys = {
  all: ['sentiment'],
  timeline: (parentAsin) => [...sentimentKeys.all, 'timeline', parentAsin || 'all'],
  monthly: (parentAsin) => [...sentimentKeys.all, 'monthly', parentAsin || 'all'],
  daily: (parentAsin) => [...sentimentKeys.all, 'daily', parentAsin || 'all'],
  timeSeries: (parentAsin, startDate, endDate) => [...sentimentKeys.all, 'timeSeries', parentAsin || 'all', startDate, endDate],
};

// Helper function to get auth headers (we'll need to access auth context)
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Yearly sentiment timeline query hook
export const useSentimentTimeline = (parentAsin) => {
  return useQuery({
    queryKey: sentimentKeys.timeline(parentAsin),
    queryFn: async () => {
      console.log('Fetching yearly sentiment timeline for:', parentAsin || 'all products');
      const url = parentAsin 
        ? `/pages/sentiment-timeline?parent_asin=${parentAsin}`
        : '/pages/sentiment-timeline';
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sentiment data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: true, // Always enabled, but will cache based on parentAsin
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Monthly sentiment data query hook
export const useMonthlySentiment = (parentAsin) => {
  return useQuery({
    queryKey: sentimentKeys.monthly(parentAsin),
    queryFn: async () => {
      console.log('Fetching monthly sentiment data for:', parentAsin || 'all products');
      const url = parentAsin 
        ? `/pages/sentiment-monthly?parent_asin=${parentAsin}`
        : '/pages/sentiment-monthly';
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly sentiment data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Daily sentiment data query hook
export const useDailySentiment = (parentAsin) => {
  return useQuery({
    queryKey: sentimentKeys.daily(parentAsin),
    queryFn: async () => {
      console.log('Fetching daily sentiment data for:', parentAsin || 'all products');
      const url = parentAsin 
        ? `/pages/sentiment-daily?parent_asin=${parentAsin}`
        : '/pages/sentiment-daily';
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch daily sentiment data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Time series sentiment data query hook (with date range)
export const useTimeSeriesSentiment = (parentAsin, startDate, endDate) => {
  return useQuery({
    queryKey: sentimentKeys.timeSeries(parentAsin, startDate, endDate),
    queryFn: async () => {
      console.log('Fetching time series sentiment data for:', parentAsin || 'all products', 'from', startDate, 'to', endDate);
      const url = parentAsin 
        ? `/pages/sentiment-time-series?parent_asin=${parentAsin}&start_date=${startDate}&end_date=${endDate}`
        : `/pages/sentiment-time-series?start_date=${startDate}&end_date=${endDate}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch time series sentiment data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(startDate && endDate), // Only fetch when both dates are provided
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Combined sentiment queries hook for convenience
export const useSentimentComplete = (parentAsin, startDate, endDate) => {
  const timelineQuery = useSentimentTimeline(parentAsin);
  const monthlyQuery = useMonthlySentiment(parentAsin);
  const dailyQuery = useDailySentiment(parentAsin);
  const timeSeriesQuery = useTimeSeriesSentiment(parentAsin, startDate, endDate);

  return {
    // Individual data
    sentimentData: timelineQuery.data,
    monthlySentimentData: monthlyQuery.data,
    dailySentimentData: dailyQuery.data,
    timeSeriesData: timeSeriesQuery.data,
    
    // Individual loading states
    loading: timelineQuery.isLoading,
    monthlyLoading: monthlyQuery.isLoading,
    dailyLoading: dailyQuery.isLoading,
    timeSeriesLoading: timeSeriesQuery.isLoading,
    
    // Individual error states
    error: timelineQuery.error,
    monthlyError: monthlyQuery.error,
    dailyError: dailyQuery.error,
    timeSeriesError: timeSeriesQuery.error,
    
    // Combined states
    isAnyLoading: timelineQuery.isLoading || monthlyQuery.isLoading || dailyQuery.isLoading || timeSeriesQuery.isLoading,
    hasAnyError: timelineQuery.isError || monthlyQuery.isError || dailyQuery.isError || timeSeriesQuery.isError,
    
    // Refetch functions
    refetchTimeline: timelineQuery.refetch,
    refetchMonthly: monthlyQuery.refetch,
    refetchDaily: dailyQuery.refetch,
    refetchTimeSeries: timeSeriesQuery.refetch,
    refetchAll: () => {
      timelineQuery.refetch();
      monthlyQuery.refetch();
      dailyQuery.refetch();
      timeSeriesQuery.refetch();
    }
  };
};

// Hook to invalidate sentiment queries
export const useInvalidateSentimentQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      console.log('Invalidating all sentiment queries');
      queryClient.invalidateQueries({ queryKey: sentimentKeys.all });
    },
    invalidateForProduct: (parentAsin) => {
      console.log('Invalidating sentiment queries for product:', parentAsin);
      queryClient.invalidateQueries({ queryKey: sentimentKeys.timeline(parentAsin) });
      queryClient.invalidateQueries({ queryKey: sentimentKeys.monthly(parentAsin) });
      queryClient.invalidateQueries({ queryKey: sentimentKeys.daily(parentAsin) });
    },
    invalidateTimeSeries: (parentAsin, startDate, endDate) => {
      console.log('Invalidating time series sentiment queries for product:', parentAsin);
      queryClient.invalidateQueries({ queryKey: sentimentKeys.timeSeries(parentAsin, startDate, endDate) });
    },
    removeAll: () => {
      console.log('Removing all sentiment queries from cache');
      queryClient.removeQueries({ queryKey: sentimentKeys.all });
    }
  };
}; 