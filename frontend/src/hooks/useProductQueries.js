import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Query keys factory
export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (category) => [...productKeys.lists(), category],
  details: () => [...productKeys.all, 'detail'],
  detail: (parentAsin) => [...productKeys.details(), parentAsin],
  sentiment: () => [...productKeys.all, 'sentiment'],
  sentimentDetail: (parentAsin) => [...productKeys.sentiment(), parentAsin],
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Categories query hook
export const useProductCategories = () => {
  return useQuery({
    queryKey: [...productKeys.all, 'categories'],
    queryFn: async () => {
      console.log('Fetching product categories');
      try {
        const response = await axios.get('/pages/product-categories', {
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed: Please log in to view categories');
        }
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Products list query hook (filtered by category)
export const useProductsList = (category) => {
  return useQuery({
    queryKey: productKeys.list(category),
    queryFn: async () => {
      console.log('Fetching products for category:', category || 'all');
      try {
        const response = await axios.get('/pages/products', {
          params: category ? { category } : {},
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed: Please log in to view products');
        }
        throw error;
      }
    },
    enabled: !!category, // Only fetch when a category is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Product details query hook
export const useProductDetails = (parentAsin) => {
  return useQuery({
    queryKey: productKeys.detail(parentAsin),
    queryFn: async () => {
      console.log('Fetching product details for:', parentAsin);
      try {
        const response = await axios.get('/pages/product-details', {
          params: { parent_asin: parentAsin },
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed: Please log in to view product details');
        }
        throw error;
      }
    },
    enabled: !!parentAsin, // Only fetch when a product is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Product sentiment data query hook (uses dedicated Product sentiment endpoint)
export const useProductSentiment = (parentAsin, filters = {}) => {
  return useQuery({
    queryKey: [...productKeys.sentimentDetail(parentAsin), filters],
    queryFn: async () => {
      console.log('Fetching sentiment data for Product page:', parentAsin, 'with filters:', filters);
      
      if (!parentAsin) {
        return null;
      }
      
      // Build URL with filters
      const params = new URLSearchParams({
        parent_asin: parentAsin
      });
      
      // Add date filters if provided
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.cities) params.append('cities', filters.cities);
      
      const url = `/api/products/sentiment-summary?${params.toString()}`;
      
      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: Please log in to view sentiment data`);
        }
        throw new Error(`Failed to fetch sentiment data: ${response.statusText} (${response.status})`);
      }
      
      const data = await response.json();
      
      // Return data in the expected format for Product page
      return data;
    },
    enabled: !!parentAsin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to invalidate product-related queries
export const useInvalidateProductQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateCategories: () => {
      console.log('Invalidating product categories');
      queryClient.invalidateQueries({ queryKey: [...productKeys.all, 'categories'] });
    },
    invalidateProductsList: (category = null) => {
      if (category) {
        console.log('Invalidating products list for category:', category);
        queryClient.invalidateQueries({ queryKey: productKeys.list(category) });
      } else {
        console.log('Invalidating all products lists');
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      }
    },
    invalidateProductDetails: (parentAsin = null) => {
      if (parentAsin) {
        console.log('Invalidating product details for:', parentAsin);
        queryClient.invalidateQueries({ queryKey: productKeys.detail(parentAsin) });
      } else {
        console.log('Invalidating all product details');
        queryClient.invalidateQueries({ queryKey: productKeys.details() });
      }
    },
    invalidateProductSentiment: (parentAsin = null) => {
      if (parentAsin) {
        console.log('Invalidating product sentiment for:', parentAsin);
        queryClient.invalidateQueries({ queryKey: productKeys.sentimentDetail(parentAsin) });
      } else {
        console.log('Invalidating all product sentiment data');
        queryClient.invalidateQueries({ queryKey: productKeys.sentiment() });
      }
    },
    invalidateAll: () => {
      console.log('Invalidating all product queries');
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    }
  };
}; 