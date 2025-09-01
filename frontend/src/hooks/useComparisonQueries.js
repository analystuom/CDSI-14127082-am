import { useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export const comparisonKeys = {
  all: ['comparison'],
  data: (parentAsin) => [...comparisonKeys.all, 'data', parentAsin || 'all'],
  categoryComparison: (category) => [...comparisonKeys.all, 'category', category || 'all'],
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Product comparison data query hook
export const useProductComparison = (parentAsin) => {
  return useQuery({
    queryKey: comparisonKeys.data(parentAsin),
    queryFn: async () => {
      console.log('Fetching product comparison data for:', parentAsin || 'all products');
      const url = parentAsin 
        ? `/pages/product-comparison?parent_asin=${parentAsin}`
        : '/pages/product-comparison';
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comparison data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!parentAsin, // Only fetch when a product is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Category comparison data query hook
export const useCategoryComparison = (category) => {
  return useQuery({
    queryKey: comparisonKeys.categoryComparison(category),
    queryFn: async () => {
      console.log('Fetching category comparison data for:', category || 'all categories');
      const url = category 
        ? `/pages/category-comparison?category=${category}`
        : '/pages/category-comparison';
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch category comparison data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!category, // Only fetch when a category is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Combined comparison queries hook for convenience
export const useComparisonComplete = (parentAsin, category) => {
  const productQuery = useProductComparison(parentAsin);
  const categoryQuery = useCategoryComparison(category);

  return {
    // Individual data
    comparisonData: productQuery.data,
    categoryComparisonData: categoryQuery.data,
    
    // Individual loading states
    isLoadingComparison: productQuery.isLoading,
    isLoadingCategory: categoryQuery.isLoading,
    
    // Individual error states
    comparisonError: productQuery.error,
    categoryError: categoryQuery.error,
    
    // Combined states
    isAnyLoading: productQuery.isLoading || categoryQuery.isLoading,
    hasAnyError: productQuery.isError || categoryQuery.isError,
    
    // Success states
    isComparisonSuccess: productQuery.isSuccess,
    isCategorySuccess: categoryQuery.isSuccess,
    
    // Refetch functions
    refetchComparison: productQuery.refetch,
    refetchCategory: categoryQuery.refetch,
    refetchAll: () => {
      productQuery.refetch();
      categoryQuery.refetch();
    }
  };
};

// Multi-product comparison query hook
export const useMultiProductComparison = (selectedProductIds) => {
  return useQuery({
    queryKey: [...comparisonKeys.all, 'multi', selectedProductIds.sort().join(',')],
    queryFn: async () => {
      console.log('Fetching multi-product comparison data for:', selectedProductIds);
      
      if (!selectedProductIds || selectedProductIds.length === 0) {
        return [];
      }
      
      const parentAsinsParam = selectedProductIds.join(',');
      const url = `/api/products/comparison?parent_asins=${encodeURIComponent(parentAsinsParam)}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch multi-product comparison data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(selectedProductIds && selectedProductIds.length > 0),
    staleTime: 15 * 60 * 1000, // 15 minutes (increased for persistence)
    cacheTime: 30 * 60 * 1000, // 30 minutes (increased for persistence)
    keepPreviousData: true, // Keep previous data while fetching new data
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Products by category query hook for dropdown population
export const useProductsByCategory = (primaryProductId) => {
  return useQuery({
    queryKey: [...comparisonKeys.all, 'by-category', primaryProductId],
    queryFn: async () => {
      console.log('Fetching products by category for primary product:', primaryProductId);
      
      if (!primaryProductId) {
        return [];
      }
      
      const url = `/api/products/by-category?parent_asin=${encodeURIComponent(primaryProductId)}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch category products: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!primaryProductId,
    staleTime: 20 * 60 * 1000, // 20 minutes (category data changes rarely)
    cacheTime: 60 * 60 * 1000, // 60 minutes (keep category data longer)
    keepPreviousData: true, // Keep previous data while fetching new data
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Timeline comparison data query hook with timestamps and date filtering
export const useMultiProductTimelineComparison = (selectedProductIds, startDate, endDate) => {
  return useQuery({
    queryKey: [...comparisonKeys.all, 'timeline', selectedProductIds.sort().join(','), startDate || 'all', endDate || 'all'],
    queryFn: async () => {
      console.log('Fetching timeline comparison data for:', selectedProductIds, 'from', startDate, 'to', endDate);
      
      if (!selectedProductIds || selectedProductIds.length === 0) {
        return [];
      }
      
      const parentAsinsParam = selectedProductIds.join(',');
      const params = new URLSearchParams({
        parent_asins: parentAsinsParam,
        review_limit: '2000'
      });
      
      // Add date parameters if provided
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }
      
      const url = `/api/products/timeline-comparison?${params.toString()}`;
      
      // Debug logging (can be removed in production)
      // console.log('Timeline comparison API call:', {
      //   url,
      //   selectedProductIds,
      //   startDate,
      //   endDate,
      //   params: params.toString()
      // });
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch timeline comparison data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(selectedProductIds && selectedProductIds.length > 0),
    staleTime: 15 * 60 * 1000, // 15 minutes (increased for persistence)
    cacheTime: 30 * 60 * 1000, // 30 minutes (increased for persistence)
    keepPreviousData: true, // Keep previous data while fetching new data
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Yearly timeline comparison data query hook for card view
export const useMultiProductYearlyTimelineComparison = (selectedProductIds) => {
  return useQuery({
    queryKey: [...comparisonKeys.all, 'yearly-timeline', selectedProductIds.sort().join(',')],
    queryFn: async () => {
      console.log('Fetching yearly timeline comparison data for:', selectedProductIds);
      
      if (!selectedProductIds || selectedProductIds.length === 0) {
        return [];
      }
      
      const parentAsinsParam = selectedProductIds.join(',');
      const url = `/api/products/yearly-timeline-comparison?parent_asins=${encodeURIComponent(parentAsinsParam)}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch yearly timeline comparison data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(selectedProductIds && selectedProductIds.length > 0),
    staleTime: 20 * 60 * 1000, // 20 minutes (yearly data changes less frequently)
    cacheTime: 40 * 60 * 1000, // 40 minutes
    keepPreviousData: true, // Keep previous data while fetching new data
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Hook to preload comparison data
export const usePreloadComparisonData = () => {
  const queryClient = useQueryClient();

  const preloadComparison = (productIds) => {
    if (!productIds || productIds.length === 0) return;
    
    const queryKey = [...comparisonKeys.all, 'multi', productIds.sort().join(',')];
    
    // Check if data is already cached
    const existingData = queryClient.getQueryData(queryKey);
    if (existingData) {
      console.log('Comparison data already cached for:', productIds);
      return;
    }
    
    // Prefetch the data
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        console.log('Prefetching comparison data for:', productIds);
        const parentAsinsParam = productIds.join(',');
        const url = `/api/products/comparison?parent_asins=${encodeURIComponent(parentAsinsParam)}`;
        
        const response = await fetch(url, { 
          headers: getAuthHeaders() 
        });
        
        if (!response.ok) {
          throw new Error(`Failed to prefetch comparison data: ${response.statusText}`);
        }
        
        return response.json();
      },
      staleTime: 15 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
    });
  };

  const preloadCategoryProducts = (primaryProductId) => {
    if (!primaryProductId) return;
    
    const queryKey = [...comparisonKeys.all, 'by-category', primaryProductId];
    
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        console.log('Prefetching category products for:', primaryProductId);
        const url = `/api/products/by-category?parent_asin=${encodeURIComponent(primaryProductId)}`;
        
        const response = await fetch(url, { 
          headers: getAuthHeaders() 
        });
        
        if (!response.ok) {
          throw new Error(`Failed to prefetch category products: ${response.statusText}`);
        }
        
        return response.json();
      },
      staleTime: 20 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
    });
  };

  return {
    preloadComparison,
    preloadCategoryProducts
  };
};

// Hook to check if comparison data is available in cache
export const useComparisonDataAvailability = (productIds) => {
  const queryClient = useQueryClient();
  
  if (!productIds || productIds.length === 0) {
    return { isAvailable: false, data: null };
  }
  
  const queryKey = [...comparisonKeys.all, 'multi', productIds.sort().join(',')];
  const cachedData = queryClient.getQueryData(queryKey);
  
  return {
    isAvailable: !!cachedData,
    data: cachedData || null,
    queryKey
  };
};

// Comprehensive product statistics query hook - fetches all metrics at once
export const useComprehensiveProductStats = (selectedProductIds) => {
  return useQuery({
    queryKey: [...comparisonKeys.all, 'comprehensive-stats', selectedProductIds.sort().join(',')],
    queryFn: async () => {
      console.log('Fetching comprehensive product stats for:', selectedProductIds);
      
      if (!selectedProductIds || selectedProductIds.length === 0) {
        return [];
      }
      
      const parentAsinsParam = selectedProductIds.join(',');
      const url = `/api/products/comprehensive-stats?parent_asins=${encodeURIComponent(parentAsinsParam)}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comprehensive product stats: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(selectedProductIds && selectedProductIds.length > 0),
    staleTime: 20 * 60 * 1000, // 20 minutes (longer since it's more comprehensive)
    cacheTime: 40 * 60 * 1000, // 40 minutes
    keepPreviousData: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Comparison Dashboard Data query hook - comprehensive data for dashboard
export const useComparisonDashboardData = (selectedProductIds, appliedFilters) => {
  return useQuery({
    queryKey: [...comparisonKeys.all, 'dashboard-data', selectedProductIds.sort().join(','), appliedFilters?.startDate || 'all', appliedFilters?.endDate || 'all', appliedFilters?.cities || 'all'],
    queryFn: async () => {
      console.log('Fetching comparison dashboard data for:', selectedProductIds, 'with filters:', appliedFilters);
      
      if (!selectedProductIds || selectedProductIds.length === 0) {
        return {
          basic_comparison: [],
          timeline_data: [],
          scatter_data: []
        };
      }
      
      const parentAsinsParam = selectedProductIds.join(',');
      const params = new URLSearchParams({
        parent_asins: parentAsinsParam
      });
      
      // Add filter parameters if provided
      if (appliedFilters?.startDate) {
        params.append('start_date', appliedFilters.startDate);
      }
      if (appliedFilters?.endDate) {
        params.append('end_date', appliedFilters.endDate);
      }
      if (appliedFilters?.cities) {
        params.append('cities', appliedFilters.cities);
      }
      
      const url = `/api/products/comparison-dashboard-data?${params.toString()}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comparison dashboard data: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(selectedProductIds && selectedProductIds.length > 0),
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    keepPreviousData: true, // Keep previous data while fetching new data
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Hook to invalidate comparison queries
export const useInvalidateComparisonQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      console.log('Invalidating all comparison queries');
      queryClient.invalidateQueries({ queryKey: comparisonKeys.all });
    },
    invalidateForProduct: (parentAsin) => {
      console.log('Invalidating comparison queries for product:', parentAsin);
      queryClient.invalidateQueries({ queryKey: comparisonKeys.data(parentAsin) });
    },
    invalidateForCategory: (category) => {
      console.log('Invalidating comparison queries for category:', category);
      queryClient.invalidateQueries({ queryKey: comparisonKeys.categoryComparison(category) });
    },
    invalidateByCategory: (primaryProductId) => {
      console.log('Invalidating by-category queries for product:', primaryProductId);
      queryClient.invalidateQueries({ queryKey: [...comparisonKeys.all, 'by-category', primaryProductId] });
    },
    invalidateDashboardData: (selectedProductIds, appliedFilters) => {
      console.log('Invalidating dashboard data for products:', selectedProductIds, 'with filters:', appliedFilters);
      const queryKey = [...comparisonKeys.all, 'dashboard-data', selectedProductIds.sort().join(','), appliedFilters?.startDate || 'all', appliedFilters?.endDate || 'all', appliedFilters?.cities || 'all'];
      queryClient.invalidateQueries({ queryKey });
    },
    removeAll: () => {
      console.log('Removing all comparison queries from cache');
      queryClient.removeQueries({ queryKey: comparisonKeys.all });
    }
  };
}; 