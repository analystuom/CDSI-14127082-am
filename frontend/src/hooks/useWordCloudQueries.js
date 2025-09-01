import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Query keys factory
export const wordCloudKeys = {
  all: ['wordcloud'],
  data: (parentAsin) => [...wordCloudKeys.all, 'data', parentAsin || 'all'],
  reviews: (parentAsin) => [...wordCloudKeys.all, 'reviews', parentAsin || 'all'],
  bigram: (parentAsin) => [...wordCloudKeys.all, 'bigram', parentAsin || 'all'],
  trigram: (parentAsin) => [...wordCloudKeys.all, 'trigram', parentAsin || 'all'],
};

// Main word cloud data query
export const useWordCloudData = (parentAsin, filters = {}) => {
  return useQuery({
    queryKey: [...wordCloudKeys.data(parentAsin), filters],
    queryFn: async () => {
      console.log('Fetching word cloud data for:', parentAsin || 'all products', 'with filters:', filters);
      
      const params = parentAsin ? { parent_asin: parentAsin } : {};
      
      // Add date filters if provided
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.cities) params.cities = filters.cities;
      
      const response = await axios.get('/api/reviews/wordcloud', {
        params
      });
      return response.data;
    },
    enabled: true, // Always enabled, but will cache based on parentAsin and filters
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Legacy reviews data query (for modal functionality)
export const useWordCloudReviews = (parentAsin, filters = {}) => {
  return useQuery({
    queryKey: [...wordCloudKeys.reviews(parentAsin), filters],
    queryFn: async () => {
      console.log('Fetching word cloud reviews for:', parentAsin || 'all products', 'with filters:', filters);
      
      const params = parentAsin ? { parent_asin: parentAsin } : {};
      
      // Add date filters if provided
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.cities) params.cities = filters.cities;
      
      const response = await axios.get('/api/reviews/wordcloud-legacy', {
        params
      });
      return response.data;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Bi-gram word cloud data query
export const useBigramWordCloudData = (parentAsin) => {
  return useQuery({
    queryKey: wordCloudKeys.bigram(parentAsin),
    queryFn: async () => {
      console.log('Fetching bi-gram word cloud data for:', parentAsin || 'all products');
      const response = await axios.get('/api/reviews/wordcloud-bigram', {
        params: parentAsin ? { parent_asin: parentAsin } : {}
      });
      return response.data;
    },
    enabled: true, // Always enabled, but will cache based on parentAsin
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Tri-gram word cloud data query
export const useTrigramWordCloudData = (parentAsin) => {
  return useQuery({
    queryKey: wordCloudKeys.trigram(parentAsin),
    queryFn: async () => {
      console.log('Fetching tri-gram word cloud data for:', parentAsin || 'all products');
      const response = await axios.get('/api/reviews/wordcloud-trigram', {
        params: parentAsin ? { parent_asin: parentAsin } : {}
      });
      return response.data;
    },
    enabled: true, // Always enabled, but will cache based on parentAsin
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Combined query hook that fetches both data sources
export const useWordCloudComplete = (parentAsin, filters = {}) => {
  const wordCloudQuery = useWordCloudData(parentAsin, filters);
  const reviewsQuery = useWordCloudReviews(parentAsin, filters);

  return {
    // Word cloud specific data
    wordCloudData: wordCloudQuery.data,
    isWordCloudLoading: wordCloudQuery.isLoading,
    wordCloudError: wordCloudQuery.error,
    
    // Reviews data
    reviewsData: reviewsQuery.data,
    isReviewsLoading: reviewsQuery.isLoading,
    reviewsError: reviewsQuery.error,
    
    // Combined states
    isLoading: wordCloudQuery.isLoading || reviewsQuery.isLoading,
    isError: wordCloudQuery.isError || reviewsQuery.isError,
    error: wordCloudQuery.error || reviewsQuery.error,
    
    // Success state when both queries are successful
    isSuccess: wordCloudQuery.isSuccess && reviewsQuery.isSuccess,
    
    // Refetch functions
    refetchWordCloud: wordCloudQuery.refetch,
    refetchReviews: reviewsQuery.refetch,
    refetchAll: () => {
      wordCloudQuery.refetch();
      reviewsQuery.refetch();
    }
  };
};

// Combined query hook for bi-gram data
export const useBigramWordCloudComplete = (parentAsin) => {
  const bigramQuery = useBigramWordCloudData(parentAsin);
  const reviewsQuery = useWordCloudReviews(parentAsin);

  return {
    // Bi-gram specific data
    bigramData: bigramQuery.data,
    isBigramLoading: bigramQuery.isLoading,
    bigramError: bigramQuery.error,
    
    // Reviews data
    reviewsData: reviewsQuery.data,
    isReviewsLoading: reviewsQuery.isLoading,
    reviewsError: reviewsQuery.error,
    
    // Combined states
    isLoading: bigramQuery.isLoading || reviewsQuery.isLoading,
    isError: bigramQuery.isError || reviewsQuery.isError,
    error: bigramQuery.error || reviewsQuery.error,
    
    // Success state when both queries are successful
    isSuccess: bigramQuery.isSuccess && reviewsQuery.isSuccess,
    
    // Refetch functions
    refetchBigram: bigramQuery.refetch,
    refetchReviews: reviewsQuery.refetch,
    refetchAll: () => {
      bigramQuery.refetch();
      reviewsQuery.refetch();
    }
  };
};

// Combined query hook for tri-gram data
export const useTrigramWordCloudComplete = (parentAsin) => {
  const trigramQuery = useTrigramWordCloudData(parentAsin);
  const reviewsQuery = useWordCloudReviews(parentAsin);

  return {
    // Tri-gram specific data
    trigramData: trigramQuery.data,
    isTrigramLoading: trigramQuery.isLoading,
    trigramError: trigramQuery.error,
    
    // Reviews data
    reviewsData: reviewsQuery.data,
    isReviewsLoading: reviewsQuery.isLoading,
    reviewsError: reviewsQuery.error,
    
    // Combined states
    isLoading: trigramQuery.isLoading || reviewsQuery.isLoading,
    isError: trigramQuery.isError || reviewsQuery.isError,
    error: trigramQuery.error || reviewsQuery.error,
    
    // Success state when both queries are successful
    isSuccess: trigramQuery.isSuccess && reviewsQuery.isSuccess,
    
    // Refetch functions
    refetchTrigram: trigramQuery.refetch,
    refetchReviews: reviewsQuery.refetch,
    refetchAll: () => {
      trigramQuery.refetch();
      reviewsQuery.refetch();
    }
  };
};

// Hook to invalidate queries when product selection changes
export const useInvalidateWordCloudQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      console.log('Invalidating all word cloud queries');
      queryClient.invalidateQueries({ queryKey: wordCloudKeys.all });
    },
    invalidateForProduct: (parentAsin) => {
      console.log('Invalidating word cloud queries for product:', parentAsin);
      queryClient.invalidateQueries({ queryKey: wordCloudKeys.data(parentAsin) });
      queryClient.invalidateQueries({ queryKey: wordCloudKeys.reviews(parentAsin) });
      queryClient.invalidateQueries({ queryKey: wordCloudKeys.bigram(parentAsin) });
      queryClient.invalidateQueries({ queryKey: wordCloudKeys.trigram(parentAsin) });
    },
    removeAll: () => {
      console.log('Removing all word cloud queries from cache');
      queryClient.removeQueries({ queryKey: wordCloudKeys.all });
    }
  };
}; 