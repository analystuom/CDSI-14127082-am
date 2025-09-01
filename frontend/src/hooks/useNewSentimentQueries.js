import { useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys factory for new sentiment endpoints
export const newSentimentKeys = {
  all: ['newSentiment'],
  trends: (parentAsin, startDate, endDate) => [...newSentimentKeys.all, 'trends', parentAsin, startDate, endDate],
  distributions: (parentAsin, period) => [...newSentimentKeys.all, 'distributions', parentAsin, period],
  dateRange: (parentAsin) => [...newSentimentKeys.all, 'dateRange', parentAsin],
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Sentiment trend over time query hook
export const useSentimentTrends = (parentAsin, startDate, endDate, cities = null) => {
  return useQuery({
    queryKey: [...newSentimentKeys.trends(parentAsin, startDate, endDate), cities],
    queryFn: async () => {
      console.log('Fetching sentiment trends for:', parentAsin, 'from', startDate, 'to', endDate, 'cities:', cities);
      
      const params = new URLSearchParams({
        parent_asin: parentAsin,
        startDate: startDate,
        endDate: endDate
      });
      
      // Add cities filter if provided
      if (cities) {
        params.append('cities', cities);
      }
      
      const response = await fetch(`/api/trends/sentiment-over-time?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sentiment trends: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(parentAsin && startDate && endDate), // Only fetch when all params are available
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Sentiment distributions query hook
export const useSentimentDistributions = (parentAsin, period, startDate, endDate, cities = null) => {
  return useQuery({
    queryKey: [...newSentimentKeys.distributions(parentAsin, period), startDate, endDate, cities],
    queryFn: async () => {
      console.log('Fetching sentiment distributions for:', parentAsin, 'period:', period, 'dates:', startDate, 'to', endDate, 'cities:', cities);
      
      const params = new URLSearchParams({
        parent_asin: parentAsin,
        period: period
      });
      
      // Add date filters if provided
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      // Add cities filter if provided
      if (cities) {
        params.append('cities', cities);
      }
      
      const response = await fetch(`/api/distributions/sentiment?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sentiment distributions: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(parentAsin && period), // Only fetch when both params are available
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Product date range query hook
export const useProductDateRange = (parentAsin) => {
  return useQuery({
    queryKey: newSentimentKeys.dateRange(parentAsin),
    queryFn: async () => {
      console.log('Fetching date range for product:', parentAsin);
      
      const params = new URLSearchParams({
        parent_asin: parentAsin
      });
      
      const response = await fetch(`/api/date-range?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product date range: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!parentAsin, // Only fetch when parentAsin is available
    staleTime: 30 * 60 * 1000, // 30 minutes (date ranges don't change often)
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
};

// Combined hook for convenience (though typically we'd use them separately)
export const useNewSentimentComplete = (parentAsin, startDate, endDate, distributionPeriod) => {
  const trendsQuery = useSentimentTrends(parentAsin, startDate, endDate);
  const distributionsQuery = useSentimentDistributions(parentAsin, distributionPeriod, startDate, endDate);

  return {
    // Trends data (for time series chart)
    trendsData: trendsQuery.data,
    isTrendsLoading: trendsQuery.isLoading,
    trendsError: trendsQuery.error,
    
    // Distributions data (for bar charts)
    distributionsData: distributionsQuery.data,
    isDistributionsLoading: distributionsQuery.isLoading,
    distributionsError: distributionsQuery.error,
    
    // Combined states
    isAnyLoading: trendsQuery.isLoading || distributionsQuery.isLoading,
    hasAnyError: trendsQuery.isError || distributionsQuery.isError,
    
    // Refetch functions
    refetchTrends: trendsQuery.refetch,
    refetchDistributions: distributionsQuery.refetch,
    refetchAll: () => {
      trendsQuery.refetch();
      distributionsQuery.refetch();
    }
  };
};

// Hook to invalidate new sentiment queries
export const useInvalidateNewSentimentQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      console.log('Invalidating all new sentiment queries');
      queryClient.invalidateQueries({ queryKey: newSentimentKeys.all });
    },
    invalidateTrends: (parentAsin, startDate, endDate) => {
      console.log('Invalidating sentiment trends for:', parentAsin);
      queryClient.invalidateQueries({ queryKey: newSentimentKeys.trends(parentAsin, startDate, endDate) });
    },
    invalidateDistributions: (parentAsin, period, startDate, endDate) => {
      console.log('Invalidating sentiment distributions for:', parentAsin, period, startDate, endDate);
      queryClient.invalidateQueries({ queryKey: [...newSentimentKeys.distributions(parentAsin, period), startDate, endDate] });
    },
    invalidateDateRange: (parentAsin) => {
      console.log('Invalidating date range for:', parentAsin);
      queryClient.invalidateQueries({ queryKey: newSentimentKeys.dateRange(parentAsin) });
    },
    removeAll: () => {
      console.log('Removing all new sentiment queries from cache');
      queryClient.removeQueries({ queryKey: newSentimentKeys.all });
    }
  };
}; 