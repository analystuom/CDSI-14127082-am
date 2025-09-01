import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { WordCloudIcon, SearchIcon } from '../components/Icons';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { useProductSelection } from '../contexts/ProductSelectionContext';
import { useWordCloudComplete, useInvalidateWordCloudQueries, useBigramWordCloudComplete, useTrigramWordCloudComplete } from '../hooks/useWordCloudQueries';

const WordCloud = ({ selectedProduct: selectedProductProp }) => {
  const navigate = useNavigate();
  const {
    selectedCategory,
    selectedProduct,
    getSelectedProductTitle,
    hasSelection,
  } = useProductSelection();

  // Use the prop if provided, otherwise fall back to context
  const currentSelectedProduct = selectedProductProp || selectedProduct;

  // TanStack Query hooks for server state management
  const {
    wordCloudData,
    reviewsData,
    isLoading,
    isError,
    error,
  } = useWordCloudComplete(currentSelectedProduct);

  // Bi-gram data query
  const {
    bigramData,
    reviewsData: bigramReviewsData,
    isLoading: isBigramLoading,
    isError: isBigramError,
    error: bigramError,
  } = useBigramWordCloudComplete(currentSelectedProduct);

  // Tri-gram data query
  const {
    trigramData,
    reviewsData: trigramReviewsData,
    isLoading: isTrigramLoading,
    isError: isTrigramError,
    error: trigramError,
  } = useTrigramWordCloudComplete(currentSelectedProduct);

  const { invalidateForProduct } = useInvalidateWordCloudQueries();

  // Local UI state
  const [processedWordData, setProcessedWordData] = useState([]);
  const [processedBigramData, setProcessedBigramData] = useState([]);
  const [processedTrigramData, setProcessedTrigramData] = useState([]);
  const [apiStats, setApiStats] = useState({
    total_reviews: 0,
    total_words_found: 0,
    unique_words: 0
  });
  const [bigramStats, setBigramStats] = useState({
    total_reviews: 0,
    total_bigrams_found: 0,
    unique_bigrams: 0
  });
  const [trigramStats, setTrigramStats] = useState({
    total_reviews: 0,
    total_trigrams_found: 0,
    unique_trigrams: 0
  });
  
  // Modal state for showing reviews
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedWordReviews, setSelectedWordReviews] = useState([]);
  
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Summary dropdown state
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  
  const [activeTab, setActiveTab] = useState('wordcloud');

  const svgRef = useRef();
  const bubbleRef = useRef();

  const isWordSimilarToGoodOrBad = (word) => {
    // Temporarily bypass complex similarity calculation for debugging
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 
      'perfect', 'outstanding', 'superb', 'brilliant', 'impressive', 'remarkable',
      'love', 'loved', 'loving', 'like', 'liked', 'enjoy', 'enjoyed', 'happy',
      'satisfied', 'pleased', 'comfortable', 'easy', 'smooth', 'fast', 'quick',
      'beautiful', 'nice', 'pretty', 'attractive', 'stylish', 'elegant',
      'quality', 'solid', 'sturdy', 'durable', 'reliable', 'strong',
      'recommend', 'recommended', 'worth', 'value', 'affordable', 'cheap',
      'best', 'better', 'superior', 'top', 'premium', 'high-quality'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'disappointing',
      'useless', 'broken', 'defective', 'faulty', 'damaged', 'cheap', 'flimsy',
      'hate', 'hated', 'dislike', 'disliked', 'annoying', 'frustrating',
      'uncomfortable', 'difficult', 'hard', 'complicated', 'confusing',
      'slow', 'delayed', 'late', 'stuck', 'problem', 'problems', 'issue', 'issues',
      'wrong', 'error', 'mistake', 'fail', 'failed', 'failure', 'not', 'never',
      'waste', 'money', 'expensive', 'overpriced', 'costly', 'regret', 'return',
      'returned', 'refund', 'disappointed', 'unsatisfied', 'unhappy'
    ];
    
    const wordLower = word.toLowerCase();
    
    // Check exact matches first
    if (positiveWords.includes(wordLower) || negativeWords.includes(wordLower)) {
      return true;
    }
    
    // Check partial matches
    const hasPositiveMatch = positiveWords.some(positiveWord => 
      wordLower.includes(positiveWord) || positiveWord.includes(wordLower)
    );
    const hasNegativeMatch = negativeWords.some(negativeWord => 
      wordLower.includes(negativeWord) || negativeWord.includes(wordLower)
    );
    
    // For debugging: if no match found, let's be more inclusive for now
    // Later we can add back the cosine similarity
    return hasPositiveMatch || hasNegativeMatch || wordLower.length > 4;
  };

  // Process word cloud data when it becomes available
  useEffect(() => {
    if (wordCloudData?.words && wordCloudData.words.length > 0) {
      console.log('Processing word cloud data from TanStack Query');
      
      // Convert API format to component format
      const wordCloudFormat = wordCloudData.words.map(item => ({
        word: item.text,
        count: item.value,
        sentiment: item.sentiment || 'neutral',
        color: item.color || 'gray',
        sentimentBreakdown: item.sentiment_breakdown || {
          positive: 0,
          negative: 0,
          neutral: 0,
          positive_percentage: 0,
          negative_percentage: 0,
          neutral_percentage: 0
        },
        totalSentimentReviews: []
      }));

      // Store API statistics
      setApiStats({
        total_reviews: wordCloudData.total_reviews || 0,
        total_words_found: wordCloudData.total_words_found || 0,
        unique_words: wordCloudData.unique_words || 0
      });

      // Process with reviews data if available
      if (reviewsData?.reviews && reviewsData.reviews.length > 0) {
        const processedWords = wordCloudFormat.map(wordItem => {
          const sentimentData = calculateWordSentiment(wordItem.word, reviewsData.reviews);
          return {
            ...wordItem,
            // Use API sentiment data if available, otherwise use calculated data
            positivePercentage: wordItem.sentimentBreakdown?.positive_percentage || sentimentData.positivePercentage,
            negativePercentage: wordItem.sentimentBreakdown?.negative_percentage || sentimentData.negativePercentage,
            totalSentimentReviews: sentimentData.totalSentimentReviews,
            matchingReviews: sentimentData.matchingReviews
          };
        });
        setProcessedWordData(processedWords);
      } else {
        // Set basic processed data without sentiment analysis
        setProcessedWordData(wordCloudFormat.map(item => ({
          ...item,
          positivePercentage: item.sentimentBreakdown?.positive_percentage || 0,
          negativePercentage: item.sentimentBreakdown?.negative_percentage || 0,
          totalSentimentReviews: (item.sentimentBreakdown?.positive || 0) + (item.sentimentBreakdown?.negative || 0),
          matchingReviews: []
        })));
      }
    } else {
      // Reset data when no word cloud data
      setProcessedWordData([]);
      setApiStats({
        total_reviews: wordCloudData?.total_reviews || 0,
        total_words_found: wordCloudData?.total_words_found || 0,
        unique_words: wordCloudData?.unique_words || 0
      });
    }
  }, [wordCloudData, reviewsData]);

  // Process bi-gram data when it becomes available
  useEffect(() => {
    if (bigramData?.words && bigramData.words.length > 0) {
      console.log('Processing bi-gram data from TanStack Query');
      
      // Convert API format to component format
      const bigramFormat = bigramData.words.map(item => ({
        word: item.text,
        count: item.value,
        sentiment: item.sentiment || 'neutral',
        color: item.color || 'gray',
        sentimentBreakdown: item.sentiment_breakdown || {
          positive: 0,
          negative: 0,
          neutral: 0,
          positive_percentage: 0,
          negative_percentage: 0,
          neutral_percentage: 0
        },
        totalSentimentReviews: []
      }));

      // Store API statistics
      setBigramStats({
        total_reviews: bigramData.total_reviews || 0,
        total_bigrams_found: bigramData.total_bigrams_found || 0,
        unique_bigrams: bigramData.unique_bigrams || 0
      });

      // Process with reviews data if available
      if (bigramReviewsData?.reviews && bigramReviewsData.reviews.length > 0) {
        const processedBigrams = bigramFormat.map(bigramItem => {
          const sentimentData = calculateWordSentiment(bigramItem.word, bigramReviewsData.reviews);
          return {
            ...bigramItem,
            // Use API sentiment data if available, otherwise use calculated data
            positivePercentage: bigramItem.sentimentBreakdown?.positive_percentage || sentimentData.positivePercentage,
            negativePercentage: bigramItem.sentimentBreakdown?.negative_percentage || sentimentData.negativePercentage,
            totalSentimentReviews: sentimentData.totalSentimentReviews,
            matchingReviews: sentimentData.matchingReviews
          };
        });
        setProcessedBigramData(processedBigrams);
      } else {
        // Set basic processed data without sentiment analysis
        setProcessedBigramData(bigramFormat.map(item => ({
          ...item,
          positivePercentage: item.sentimentBreakdown?.positive_percentage || 0,
          negativePercentage: item.sentimentBreakdown?.negative_percentage || 0,
          totalSentimentReviews: (item.sentimentBreakdown?.positive || 0) + (item.sentimentBreakdown?.negative || 0),
          matchingReviews: []
        })));
      }
    } else {
      // Reset data when no bi-gram data
      setProcessedBigramData([]);
      setBigramStats({
        total_reviews: bigramData?.total_reviews || 0,
        total_bigrams_found: bigramData?.total_bigrams_found || 0,
        unique_bigrams: bigramData?.unique_bigrams || 0
      });
    }
  }, [bigramData, bigramReviewsData]);

  // Process tri-gram data when it becomes available
  useEffect(() => {
    if (trigramData?.words && trigramData.words.length > 0) {
      console.log('Processing tri-gram data from TanStack Query');
      
      // Convert API format to component format
      const trigramFormat = trigramData.words.map(item => ({
        word: item.text,
        count: item.value,
        sentiment: item.sentiment || 'neutral',
        color: item.color || 'gray',
        sentimentBreakdown: item.sentiment_breakdown || {
          positive: 0,
          negative: 0,
          neutral: 0,
          positive_percentage: 0,
          negative_percentage: 0,
          neutral_percentage: 0
        },
        totalSentimentReviews: []
      }));

      // Store API statistics
      setTrigramStats({
        total_reviews: trigramData.total_reviews || 0,
        total_trigrams_found: trigramData.total_trigrams_found || 0,
        unique_trigrams: trigramData.unique_trigrams || 0
      });

      // Process with reviews data if available
      if (trigramReviewsData?.reviews && trigramReviewsData.reviews.length > 0) {
        const processedTrigrams = trigramFormat.map(trigramItem => {
          const sentimentData = calculateWordSentiment(trigramItem.word, trigramReviewsData.reviews);
          return {
            ...trigramItem,
            // Use API sentiment data if available, otherwise use calculated data
            positivePercentage: trigramItem.sentimentBreakdown?.positive_percentage || sentimentData.positivePercentage,
            negativePercentage: trigramItem.sentimentBreakdown?.negative_percentage || sentimentData.negativePercentage,
            totalSentimentReviews: sentimentData.totalSentimentReviews,
            matchingReviews: sentimentData.matchingReviews
          };
        });
        setProcessedTrigramData(processedTrigrams);
      } else {
        // Set basic processed data without sentiment analysis
        setProcessedTrigramData(trigramFormat.map(item => ({
          ...item,
          positivePercentage: item.sentimentBreakdown?.positive_percentage || 0,
          negativePercentage: item.sentimentBreakdown?.negative_percentage || 0,
          totalSentimentReviews: (item.sentimentBreakdown?.positive || 0) + (item.sentimentBreakdown?.negative || 0),
          matchingReviews: []
        })));
      }
    } else {
      // Reset data when no tri-gram data
      setProcessedTrigramData([]);
      setTrigramStats({
        total_reviews: trigramData?.total_reviews || 0,
        total_trigrams_found: trigramData?.total_trigrams_found || 0,
        unique_trigrams: trigramData?.unique_trigrams || 0
      });
    }
  }, [trigramData, trigramReviewsData]);

  // Handle product selection changes by invalidating queries if needed
  useEffect(() => {
    // This effect will naturally trigger query refetch when selectedProduct changes
    // due to how TanStack Query works with query keys
    console.log('Product selection changed:', selectedProduct);
  }, [selectedProduct]);

  // Helper function to create word cloud format from processed data
  const getWordCloudFormat = () => {
    if (!processedWordData.length) return [];
    return processedWordData.map(item => ({
      text: item.word,
      size: Math.max(12, Math.min(60, (item.count / (processedWordData[0]?.count || 1)) * 60 + 12)),
      count: item.count,
      sentiment: item.sentiment || 'neutral',
      color: item.color || 'gray'
    }));
  };

  // Helper function to create bi-gram word cloud format from processed data
  const getBigramWordCloudFormat = () => {
    if (!processedBigramData.length) return [];
    return processedBigramData.map(item => ({
      text: item.word,
      size: Math.max(12, Math.min(50, (item.count / (processedBigramData[0]?.count || 1)) * 50 + 12)),
      count: item.count,
      sentiment: item.sentiment || 'neutral',
      color: item.color || 'gray'
    }));
  };

  // Helper function to create tri-gram word cloud format from processed data
  const getTrigramWordCloudFormat = () => {
    if (!processedTrigramData.length) return [];
    return processedTrigramData.map(item => ({
      text: item.word,
      size: Math.max(10, Math.min(40, (item.count / (processedTrigramData[0]?.count || 1)) * 40 + 10)),
      count: item.count,
      sentiment: item.sentiment || 'neutral',
      color: item.color || 'gray'
    }));
  };

  const cleanAndAnalyzeText = (text) => {
    if (!text) return '';
    
    return text
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Function to calculate sentiment data for words
  const calculateWordSentiment = (word, reviews) => {
    const wordLower = word.toLowerCase();
    const matchingReviews = [];
    
    // Find reviews containing the word
    reviews.forEach((review, index) => {
      const reviewText = review.text || '';
      if (reviewText && reviewText.toLowerCase().includes(wordLower)) {
        matchingReviews.push(review);
      }
    });

    // Calculate sentiment percentages
    let positiveCount = 0;
    let negativeCount = 0;
    
    matchingReviews.forEach(review => {
      const rating = review.rating || 0;
      if (rating >= 4) {
        positiveCount++;
      } else if (rating <= 3) {
        negativeCount++;
      }
    });
    
    const totalSentimentReviews = positiveCount + negativeCount;
    const positivePercentage = totalSentimentReviews > 0 ? Math.round((positiveCount / totalSentimentReviews) * 100) : 0;
    const negativePercentage = totalSentimentReviews > 0 ? Math.round((negativeCount / totalSentimentReviews) * 100) : 0;
    
    return {
      positivePercentage,
      negativePercentage,
      totalSentimentReviews,
      matchingReviews
    };
  };

  const highlightText = (text, searchTerm) => {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return { type: 'highlight', content: part };
      }
      return { type: 'normal', content: part };
    });
  };

  const renderHighlightedText = (text, searchTerm, maxLength = 200) => {
    if (!text) return <span className="italic text-gray-400">No review text available</span>;
    
    let truncatedText = text;
    if (text.length > maxLength) {
      const searchIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (searchIndex !== -1) {
        const start = Math.max(0, searchIndex - 50);
        const end = Math.min(text.length, searchIndex + searchTerm.length + 50);
        truncatedText = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
      } else {
        truncatedText = text.slice(0, maxLength) + '...';
      }
    }
    
    if (!searchTerm) {
      return <span className="italic text-gray-400">Review content unavailable</span>;
    }
    
    const highlightedParts = highlightText(truncatedText, searchTerm);
    return highlightedParts.map((part, index) => {
      if (part.type === 'highlight') {
        return <span key={index}>{part.content}</span>;
      } else if (part.type === 'normal') {
        return <strong key={index}>{part.content}</strong>;
      } else if (part.type === 'italic') {
        return <em key={index}>{part.content}</em>;
      } else if (part.type === 'underline') {
        return <u key={index}>{part.content}</u>;
      } else if (part.type === 'link') {
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {part.content}
          </a>
        );
      } else if (part.type === 'code') {
        return (
          <code key={index} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
            {part.content}
          </code>
        );
      } else if (part.type === 'quote') {
        return (
          <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic">
            {part.content}
          </blockquote>
        );
      } else if (part.type === 'list') {
        return (
          <ul key={index} className="list-disc list-inside">
            {part.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        );
      } else if (part.type === 'table') {
        return (
          <table key={index} className="min-w-full border-collapse border border-gray-300">
            {part.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </table>
        );
      } else if (part.type === 'linebreak') {
        return <br key={index} />;
      } else if (part.type === 'space') {
        return <div key={index} className="h-3" />;
      } else if (part.type === 'paragraph') {
        return <p key={index} className="my-2">{part.content}</p>;
      } else {
        return <span key={index}>{part.content}</span>;
      }
    });
  };

  const handleWordClick = (word, matchingReviews = []) => {
    console.log('Word clicked:', word);
    console.log('Matching reviews for word:', matchingReviews);
    
    setSelectedWord(word);
    setSelectedWordReviews(matchingReviews);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedWord('');
    setSelectedWordReviews([]);
  };

  const processTextForWordCloud = (reviews) => {
    if (!reviews || reviews.length === 0) {
      console.log('No reviews to process');
      return [];
    }

    console.log('Processing', reviews.length, 'reviews for word cloud');
    
    const wordCount = {};
    const wordSentiments = {};
    const wordReviews = {};

    reviews.forEach((review, index) => {
      const reviewText = review.reviewText || review.review_text || review.text || '';
      const sentiment = review.sentiment || 0;
      
      if (!reviewText) {
        console.log(`Review ${index} has no text`);
        return;
      }

      const cleanedText = cleanAndAnalyzeText(reviewText);
      const words = cleanedText.split(/\s+/).filter(word => {
        if (word.length <= 2) return false;
        
        const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'too', 'any', 'she', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye'];
        if (commonWords.includes(word)) return false;
        
        return isWordSimilarToGoodOrBad(word);
      });

      if (index < 3) { // Debug first few reviews
        console.log(`Review ${index} words:`, words.slice(0, 10));
      }

      words.forEach(word => {
        if (!wordCount[word]) {
          wordCount[word] = 0;
          wordSentiments[word] = [];
          wordReviews[word] = [];
        }
        wordCount[word]++;
        wordSentiments[word].push(sentiment);
        wordReviews[word].push({
          reviewText: reviewText,
          sentiment: sentiment,
          reviewer: review.reviewer || 'Anonymous',
          rating: review.rating || 'N/A',
          date: review.date || 'Unknown'
        });
      });
    });

    console.log('Word counts found:', Object.keys(wordCount).length);

    // Convert to array format and sort by count
    const result = Object.entries(wordCount)
      .filter(([word, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([word, count]) => {
        const sentiments = wordSentiments[word];
        const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
        
        return {
          word,
          count,
          sentiment: avgSentiment,
          totalSentimentReviews: wordReviews[word]
        };
      });

    console.log('Processed word cloud data:', result.length, 'words');
    if (result.length > 0) {
      console.log('Top 5 words:', result.slice(0, 5).map(w => `${w.word}(${w.count})`));
    }
    return result;
  };

  // D3 Word Cloud and Bubble Chart functions (keeping existing functionality)
  const createD3WordCloud = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 800;
    const height = 400;
    const wordData = getWordCloudFormat();
    
    if (wordData.length === 0) return;
    
    // Create color mapping for sentiment-based coloring
    const getColorForSentiment = (wordItem) => {
      const sentiment = wordItem.sentiment || 'neutral';
      switch (sentiment) {
        case 'positive':
          return '#22c55e'; // Green-500
        case 'negative':
          return '#ef4444'; // Red-500
        default:
          return '#6b7280'; // Gray-500
      }
    };
    
    const layout = cloud()
      .size([width, height])
      .words(wordData)
      .padding(5)
      .rotate(() => (Math.random() - 0.5) * 60)
      .font("Arial, sans-serif")
      .fontSize(d => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      svg
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("max-width", "100%")
        .style("height", "auto");

      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

      const text = g.selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Arial, sans-serif")
        .style("font-weight", d => d.size > 30 ? "bold" : "normal")
        .style("fill", d => getColorForSentiment(d))
        .style("cursor", "pointer")
        .style("opacity", 0)
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text);

      text
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.8)
            .style("font-weight", "bold");
          
          const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.transition()
            .duration(200)
            .style("opacity", 1);
          
          const sentimentText = d.sentiment === 'positive' ? 'Positive' : 
                                d.sentiment === 'negative' ? 'Negative' : 'Neutral';
          tooltip.html(`"${d.text}" appears ${d.count} times<br/>Sentiment: ${sentimentText}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .style("font-weight", d => d.size > 30 ? "bold" : "normal");
          
          d3.selectAll(".d3-tooltip").remove();
        });

      text
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .style("opacity", 1);
    }
  };

  const createBubbleChart = () => {
    const svg = d3.select(bubbleRef.current);
    svg.selectAll("*").remove();
    
    const width = 800;
    const height = 500;
    
    // Take top 20 words for bubble chart
    const bubbleData = processedWordData.slice(0, 20);
    
    if (bubbleData.length === 0) return;
    
    // Create bubble pack layout
    const pack = d3.pack()
      .size([width - 40, height - 40])
      .padding(3);
    
    // Create hierarchy from data
    const root = d3.hierarchy({ children: bubbleData })
      .sum(d => d.count)
      .sort((a, b) => b.value - a.value);
    
    pack(root);
    
    // Set up SVG
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "100%")
      .style("height", "auto");
    
    // Create color mapping for sentiment-based coloring
    const getColorForSentiment = (sentiment) => {
      switch (sentiment) {
        case 'positive':
          return '#22c55e'; // Green-500
        case 'negative':
          return '#ef4444'; // Red-500
        default:
          return '#6b7280'; // Gray-500
      }
    };
    
    // Add container group
    const container = svg.append("g")
      .attr("transform", "translate(20, 20)");
    
    // Create bubbles
    const bubbles = container.selectAll(".bubble")
      .data(root.children)
      .enter().append("g")
      .attr("class", "bubble")
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer");
    
    // Add circles
    bubbles.append("circle")
      .attr("r", 0)
      .style("fill", d => {
        // Use sentiment from API data
        const sentiment = d.data.sentiment || 'neutral';
        return getColorForSentiment(sentiment);
      })
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("opacity", 0.8)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100)
      .attr("r", d => d.r);
    
    // Add text labels
    bubbles.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "600")
      .style("fill", "#1a202c")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .text(d => d.data.word)
      .each(function(d) {
        // Adjust font size based on bubble size
        const fontSize = Math.min(d.r / 3, 16);
        d3.select(this).style("font-size", `${fontSize}px`);
      })
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100 + 500)
      .style("opacity", 1);
    
    // Add count labels
    bubbles.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.5em")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "400")
      .style("fill", "#4a5568")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .text(d => `${d.data.count}×`)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100 + 700)
      .style("opacity", 1);
    
    // Add hover effects
    bubbles
      .on("mouseover", function(event, d) {
        const circle = d3.select(this).select("circle");
        
        circle
          .transition()
          .duration(200)
          .style("stroke-width", 3)
          .style("opacity", 1)
          .attr("r", d.r * 1.1);
        
        // Create tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "bubble-tooltip")
          .style("opacity", 0)
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.9)")
          .style("color", "white")
          .style("padding", "12px 16px")
          .style("border-radius", "8px")
          .style("font-size", "14px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)");

        tooltip.transition()
          .duration(200)
          .style("opacity", 1);
        
        const sentimentText = d.data.sentiment === 'positive' ? 'Positive' : 
                              d.data.sentiment === 'negative' ? 'Negative' : 'Neutral';
        const sentimentColor = d.data.sentiment === 'positive' ? '#22c55e' : 
                               d.data.sentiment === 'negative' ? '#ef4444' : '#6b7280';
        
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">"${d.data.word}"</div>
          <div>Appears ${d.data.count} times</div>
          <div style="margin-top: 4px; font-size: 12px;">
            <span style="color: ${sentimentColor};">Overall Sentiment: ${sentimentText}</span>
          </div>
          <div style="margin-top: 4px; font-size: 12px;">
            <span style="color: #48bb78;">${d.data.positivePercentage || 0}% Positive</span> • 
            <span style="color: #f56565;">${d.data.negativePercentage || 0}% Negative</span>
          </div>
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .style("stroke-width", 2)
          .style("opacity", 0.8)
          .attr("r", d.r);
        
        d3.selectAll(".bubble-tooltip").remove();
      })
      .on("click", function(event, d) {
        // Find the matching processed word data
        const processedWord = processedWordData.find(w => w.word === d.data.word);
        handleWordClick(d.data.word, processedWord?.matchingReviews || []);
      });
  };

  // D3 Bi-gram Word Cloud visualization
  const createD3BigramWordCloud = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 800;
    const height = 400;
    const bigramData = getBigramWordCloudFormat();
    
    if (bigramData.length === 0) return;
    
    // Create color mapping for sentiment-based coloring (same as word cloud)
    const getColorForSentiment = (wordItem) => {
      const sentiment = wordItem.sentiment || 'neutral';
      switch (sentiment) {
        case 'positive':
          return '#22c55e'; // Green-500
        case 'negative':
          return '#ef4444'; // Red-500
        default:
          return '#6b7280'; // Gray-500
      }
    };
    
    const layout = cloud()
      .size([width, height])
      .words(bigramData)
      .padding(8) // Slightly more padding for bi-grams
      .rotate(() => (Math.random() - 0.5) * 40) // Less rotation for readability
      .font("Arial, sans-serif")
      .fontSize(d => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      svg
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("max-width", "100%")
        .style("height", "auto");

      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

      const text = g.selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Arial, sans-serif")
        .style("font-weight", d => d.size > 25 ? "bold" : "normal")
        .style("fill", d => getColorForSentiment(d))
        .style("cursor", "pointer")
        .style("opacity", 0)
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text);

      text
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.8)
            .style("font-weight", "bold");
          
          const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.transition()
            .duration(200)
            .style("opacity", 1);
          
          const sentimentText = d.sentiment === 'positive' ? 'Positive' : 
                                d.sentiment === 'negative' ? 'Negative' : 'Neutral';
          tooltip.html(`"${d.text}" appears ${d.count} times<br/>Sentiment: ${sentimentText}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .style("font-weight", d => d.size > 25 ? "bold" : "normal");
          
          d3.selectAll(".d3-tooltip").remove();
        })
        .on("click", function(event, d) {
          // Find the matching processed bi-gram data
          const processedBigram = processedBigramData.find(w => w.word === d.text);
          handleWordClick(d.text, processedBigram?.matchingReviews || []);
        });

      text
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .style("opacity", 1);
    }
  };

  // D3 Tri-gram Word Cloud visualization
  const createD3TrigramWordCloud = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 800;
    const height = 400;
    const trigramData = getTrigramWordCloudFormat();
    
    if (trigramData.length === 0) return;
    
    // Create color mapping for sentiment-based coloring (same as word cloud)
    const getColorForSentiment = (wordItem) => {
      const sentiment = wordItem.sentiment || 'neutral';
      switch (sentiment) {
        case 'positive':
          return '#22c55e'; // Green-500
        case 'negative':
          return '#ef4444'; // Red-500
        default:
          return '#6b7280'; // Gray-500
      }
    };
    
    const layout = cloud()
      .size([width, height])
      .words(trigramData)
      .padding(10) // More padding for tri-grams as they are longer
      .rotate(() => (Math.random() - 0.5) * 30) // Less rotation for readability
      .font("Arial, sans-serif")
      .fontSize(d => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      svg
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("max-width", "100%")
        .style("height", "auto");

      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

      const text = g.selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Arial, sans-serif")
        .style("font-weight", d => d.size > 20 ? "bold" : "normal")
        .style("fill", d => getColorForSentiment(d))
        .style("cursor", "pointer")
        .style("opacity", 0)
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text);

      text
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.8)
            .style("font-weight", "bold");
          
          const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          tooltip.transition()
            .duration(200)
            .style("opacity", 1);
          
          const sentimentText = d.sentiment === 'positive' ? 'Positive' : 
                                d.sentiment === 'negative' ? 'Negative' : 'Neutral';
          tooltip.html(`"${d.text}" appears ${d.count} times<br/>Sentiment: ${sentimentText}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .style("font-weight", d => d.size > 20 ? "bold" : "normal");
          
          d3.selectAll(".d3-tooltip").remove();
        })
        .on("click", function(event, d) {
          // Find the matching processed tri-gram data
          const processedTrigram = processedTrigramData.find(w => w.word === d.text);
          handleWordClick(d.text, processedTrigram?.matchingReviews || []);
        });

      text
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .style("opacity", 1);
    }
  };

  // Use effects for creating visualizations
  useEffect(() => {
    if (activeTab === 'wordcloud' && processedWordData.length > 0) {
      createD3WordCloud();
    } else if (activeTab === 'bubble' && processedWordData.length > 0) {
      createBubbleChart();
    } else if (activeTab === 'bigram' && processedBigramData.length > 0) {
      createD3BigramWordCloud();
    } else if (activeTab === 'trigram' && processedTrigramData.length > 0) {
      createD3TrigramWordCloud();
    }
  }, [processedWordData, processedBigramData, processedTrigramData, activeTab]);

  // Handler for navigating to Product page
  const handleNavigateToProduct = () => {
    navigate('/product');
  };

  // Helper function to generate dynamic text summary
  const generateTextSummary = () => {
    if (!processedWordData.length) return null;

    // Separate words by sentiment
    const positiveWords = processedWordData.filter(word => word.sentiment === 'positive');
    const negativeWords = processedWordData.filter(word => word.sentiment === 'negative');
    const neutralWords = processedWordData.filter(word => word.sentiment === 'neutral');

    // Get top terms for each sentiment
    const topPositive = positiveWords.slice(0, 3);
    const topNegative = negativeWords.slice(0, 3);

    // Calculate percentages
    const totalWords = processedWordData.length;
    const positivePercentage = Math.round((positiveWords.length / totalWords) * 100);
    const negativePercentage = Math.round((negativeWords.length / totalWords) * 100);
    const neutralPercentage = Math.round((neutralWords.length / totalWords) * 100);

    // Generate summary text
    let summary = `Analysis of ${totalWords} unique qualitative terms extracted from customer reviews shows `;
    
    // Overall distribution
    if (positivePercentage > negativePercentage) {
      summary += `predominantly positive sentiment with ${positivePercentage}% positive terms, ${negativePercentage}% negative, and ${neutralPercentage}% neutral. `;
    } else if (negativePercentage > positivePercentage) {
      summary += `predominantly negative sentiment with ${negativePercentage}% negative terms, ${positivePercentage}% positive, and ${neutralPercentage}% neutral. `;
    } else {
      summary += `balanced sentiment with ${positivePercentage}% positive, ${negativePercentage}% negative, and ${neutralPercentage}% neutral terms. `;
    }

    // Top positive terms
    if (topPositive.length > 0) {
      const positiveTerms = topPositive.map(word => `"${word.word}" (${word.count} times)`).join(', ');
      summary += `The most frequent positive terms are: ${positiveTerms}. `;
    }

    // Top negative terms
    if (topNegative.length > 0) {
      const negativeTerms = topNegative.map(word => `"${word.word}" (${word.count} times)`).join(', ');
      summary += `The most frequent negative terms are: ${negativeTerms}. `;
    }

    // Concluding insight
    if (positivePercentage > negativePercentage * 1.5) {
      summary += `Overall, customer feedback appears predominantly positive based on the qualitative language used.`;
    } else if (negativePercentage > positivePercentage * 1.5) {
      summary += `Overall, customer feedback appears predominantly negative based on the qualitative language used.`;
    } else {
      summary += `Overall, customer feedback shows mixed sentiment with both positive and negative experiences.`;
    }

    return {
      summary,
      positiveCount: positiveWords.length,
      negativeCount: negativeWords.length,
      neutralCount: neutralWords.length,
      topPositive,
      topNegative,
      positivePercentage,
      negativePercentage,
      neutralPercentage,
      totalWords
    };
  };

  // Helper function to generate bi-gram text summary
  const generateBigramTextSummary = () => {
    if (!processedBigramData.length) return null;

    // Separate bi-grams by sentiment
    const positiveBigrams = processedBigramData.filter(bigram => bigram.sentiment === 'positive');
    const negativeBigrams = processedBigramData.filter(bigram => bigram.sentiment === 'negative');
    const neutralBigrams = processedBigramData.filter(bigram => bigram.sentiment === 'neutral');

    // Get top bi-grams for each sentiment
    const topPositive = positiveBigrams.slice(0, 3);
    const topNegative = negativeBigrams.slice(0, 3);

    // Calculate percentages
    const totalBigrams = processedBigramData.length;
    const positivePercentage = Math.round((positiveBigrams.length / totalBigrams) * 100);
    const negativePercentage = Math.round((negativeBigrams.length / totalBigrams) * 100);
    const neutralPercentage = Math.round((neutralBigrams.length / totalBigrams) * 100);

    // Generate summary text
    let summary = `Analysis of ${totalBigrams} unique qualitative bi-gram phrases extracted from customer reviews shows `;
    
    // Overall distribution
    if (positivePercentage > negativePercentage) {
      summary += `predominantly positive sentiment with ${positivePercentage}% positive phrases, ${negativePercentage}% negative, and ${neutralPercentage}% neutral. `;
    } else if (negativePercentage > positivePercentage) {
      summary += `predominantly negative sentiment with ${negativePercentage}% negative phrases, ${positivePercentage}% positive, and ${neutralPercentage}% neutral. `;
    } else {
      summary += `balanced sentiment with ${positivePercentage}% positive, ${negativePercentage}% negative, and ${neutralPercentage}% neutral phrases. `;
    }

    // Top positive bi-grams
    if (topPositive.length > 0) {
      const positiveTerms = topPositive.map(bigram => `"${bigram.word}" (${bigram.count} times)`).join(', ');
      summary += `The most frequent positive phrases are: ${positiveTerms}. `;
    }

    // Top negative bi-grams
    if (topNegative.length > 0) {
      const negativeTerms = topNegative.map(bigram => `"${bigram.word}" (${bigram.count} times)`).join(', ');
      summary += `The most frequent negative phrases are: ${negativeTerms}. `;
    }

    // Concluding insight
    if (positivePercentage > negativePercentage * 1.5) {
      summary += `Overall, bi-gram analysis indicates predominantly positive customer experiences.`;
    } else if (negativePercentage > positivePercentage * 1.5) {
      summary += `Overall, bi-gram analysis indicates predominantly negative customer experiences.`;
    } else {
      summary += `Overall, bi-gram analysis shows mixed customer sentiment with both positive and negative experiences.`;
    }

    return {
      summary,
      positiveCount: positiveBigrams.length,
      negativeCount: negativeBigrams.length,
      neutralCount: neutralBigrams.length,
      topPositive,
      topNegative,
      positivePercentage,
      negativePercentage,
      neutralPercentage,
      totalBigrams
    };
  };

  // Helper function to generate tri-gram text summary
  const generateTrigramTextSummary = () => {
    if (!processedTrigramData.length) return null;

    // Separate tri-grams by sentiment
    const positiveTrigrams = processedTrigramData.filter(trigram => trigram.sentiment === 'positive');
    const negativeTrigrams = processedTrigramData.filter(trigram => trigram.sentiment === 'negative');
    const neutralTrigrams = processedTrigramData.filter(trigram => trigram.sentiment === 'neutral');

    // Get top tri-grams for each sentiment
    const topPositive = positiveTrigrams.slice(0, 3);
    const topNegative = negativeTrigrams.slice(0, 3);

    // Calculate percentages
    const totalTrigrams = processedTrigramData.length;
    const positivePercentage = Math.round((positiveTrigrams.length / totalTrigrams) * 100);
    const negativePercentage = Math.round((negativeTrigrams.length / totalTrigrams) * 100);
    const neutralPercentage = Math.round((neutralTrigrams.length / totalTrigrams) * 100);

    // Generate summary text
    let summary = `Analysis of ${totalTrigrams} unique qualitative tri-gram phrases extracted from customer reviews shows `;
    
    // Overall distribution
    if (positivePercentage > negativePercentage) {
      summary += `predominantly positive sentiment with ${positivePercentage}% positive phrases, ${negativePercentage}% negative, and ${neutralPercentage}% neutral. `;
    } else if (negativePercentage > positivePercentage) {
      summary += `predominantly negative sentiment with ${negativePercentage}% negative phrases, ${positivePercentage}% positive, and ${neutralPercentage}% neutral. `;
    } else {
      summary += `balanced sentiment with ${positivePercentage}% positive, ${negativePercentage}% negative, and ${neutralPercentage}% neutral phrases. `;
    }

    // Top positive tri-grams
    if (topPositive.length > 0) {
      const positiveTerms = topPositive.map(trigram => `"${trigram.word}" (${trigram.count} times)`).join(', ');
      summary += `The most frequent positive phrases are: ${positiveTerms}. `;
    }

    // Top negative tri-grams
    if (topNegative.length > 0) {
      const negativeTerms = topNegative.map(trigram => `"${trigram.word}" (${trigram.count} times)`).join(', ');
      summary += `The most frequent negative phrases are: ${negativeTerms}. `;
    }

    // Concluding insight
    if (positivePercentage > negativePercentage * 1.5) {
      summary += `Overall, tri-gram analysis reveals predominantly positive customer experiences through phrase patterns.`;
    } else if (negativePercentage > positivePercentage * 1.5) {
      summary += `Overall, tri-gram analysis reveals predominantly negative customer experiences through phrase patterns.`;
    } else {
      summary += `Overall, tri-gram analysis shows mixed customer sentiment with both positive and negative phrase patterns.`;
    }

    return {
      summary,
      positiveCount: positiveTrigrams.length,
      negativeCount: negativeTrigrams.length,
      neutralCount: neutralTrigrams.length,
      topPositive,
      topNegative,
      positivePercentage,
      negativePercentage,
      neutralPercentage,
      totalTrigrams
    };
  };

  // Comprehensive summary function for all chart types
  const generateComprehensiveSummary = () => {
    const wordSummary = generateTextSummary();
    const bigramSummary = generateBigramTextSummary();
    const trigramSummary = generateTrigramTextSummary();
    
    if (!wordSummary && !bigramSummary && !trigramSummary) return null;

    return {
      wordCloud: wordSummary,
      bubbleChart: wordSummary, // Same data as word cloud, different visualization
      bigramAnalysis: bigramSummary,
      trigramAnalysis: trigramSummary,
      hasData: Boolean(wordSummary || bigramSummary || trigramSummary)
    };
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center mb-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Qualitative Word Visualizations
        </h1>
        <div className="relative ml-3">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Information about Word Visualizations"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
              <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">About Word Visualizations</h3>
                <p className="text-base">
                  Explore qualitative words extracted from customer reviews. This section has three views:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-base">
                  <li><strong>Word Cloud:</strong> See the most frequent words and their associated sentiment</li>
                  <li><strong>Bubble Chart:</strong> Visual representation with size indicating frequency and color showing sentiment</li>
                  <li><strong>Bi-gram Word Cloud:</strong> Shows the most frequent word pairs instead of single words</li>
                </ul>
                <p className="text-base pt-2">
                  Select a product and navigate through each section to see the corresponding visualizations and results.
                </p>
              </div>
              {/* Arrow pointing up */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-300 rotate-45"></div>
            </div>
          )}
        </div>
      </div>

      {/* No Product Selected Message */}
      {!hasSelection && !selectedProductProp && (
        <Card>
          <div 
            className="text-center cursor-pointer hover:bg-gray-200 transition-colors rounded-lg p-2" 
            onClick={handleNavigateToProduct}
          >
            <h3 className="text-lg font-semibold text-black mb-2">No product selected</h3>
            <p className="text-black">
              Go to the <strong>Product</strong> page to select a product for word cloud analysis.
            </p>
          </div>
        </Card>
      )}

      {/* Content when product is selected */}
      {(hasSelection || selectedProductProp) && (
        <>
          {(isError || isBigramError || isTrigramError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {(error?.response?.status === 500 || bigramError?.response?.status === 500 || trigramError?.response?.status === 500) && 
               (error?.response?.data?.detail?.includes('NLTK') || bigramError?.response?.data?.detail?.includes('NLTK') || trigramError?.response?.data?.detail?.includes('NLTK'))
                ? 'NLTK language processing not available on server. Please contact administrator.'
                : `Failed to load ${activeTab === 'trigram' ? 'tri-gram' : activeTab === 'bigram' ? 'bi-gram' : 'word cloud'} data. Please try again later.`
              }
            </div>
          )}

      {/* Visualization Section */}
      {(isLoading || isBigramLoading || isTrigramLoading) ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-black">
                {activeTab === 'trigram' 
                  ? 'Processing all reviews for tri-gram analysis...'
                  : activeTab === 'bigram' 
                  ? 'Processing all reviews for bi-gram analysis...' 
                  : 'Processing all reviews for selected product...'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
                <WordCloudIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {activeTab === 'trigram' ? trigramStats.total_reviews : activeTab === 'bigram' ? bigramStats.total_reviews : apiStats.total_reviews}
              </div>
              <div className="text-sm text-gray-500">Reviews Analyzed</div>
            </Card>
            <Card className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
                <SearchIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {activeTab === 'trigram' ? trigramStats.unique_trigrams : activeTab === 'bigram' ? bigramStats.unique_bigrams : apiStats.unique_words}
              </div>
              <div className="text-sm text-gray-500">
                {activeTab === 'trigram' ? 'Qualitative Tri-grams' : activeTab === 'bigram' ? 'Qualitative Bi-grams' : 'Qualitative Words'}
              </div>
            </Card>
          </div> */}

          {/* Unified Word Analysis Summary */}
          {(() => {
            const comprehensiveSummary = generateComprehensiveSummary();
            if (!comprehensiveSummary || !comprehensiveSummary.hasData) return null;

            return (
              <Card title="Qualitative Word Analysis Summary">
                <div className="border border-gray-200 rounded-lg">
                  {/* Summary Header - Clickable */}
                  <button
                    onClick={() => setSummaryExpanded(!summaryExpanded)}
                    className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border-b border-gray-200 rounded-t-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-blue-900">
                            Click to {summaryExpanded ? 'hide' : 'view'} detailed analysis summaries
                          </h4>
                          <p className="text-xs text-blue-700 mt-1">
                            Includes Word Cloud, Bubble Chart, Bi-gram, and Tri-gram analysis
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg 
                          className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${summaryExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expandable Content */}
                  {summaryExpanded && (
                    <div className="p-4 space-y-6 bg-white">
                      {/* Word Cloud Analysis */}
                      {comprehensiveSummary.wordCloud && (
                        <div style={styles.insightSection}>
                          <div style={styles.insightHeader}>
                            <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                            <h5 style={styles.insightTitle}>Word Cloud Analysis</h5>
                          </div>
                          <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                            <ul style={styles.insightList}>
                              <li style={styles.insightListItem}>
                                <span style={styles.insightBullet}>•</span>
                                <span style={styles.insightText}>{comprehensiveSummary.wordCloud.summary}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Bubble Chart Analysis */}
                      {comprehensiveSummary.bubbleChart && (
                        <div style={styles.insightSection}>
                          <div style={styles.insightHeader}>
                            <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                            <h5 style={styles.insightTitle}>Bubble Chart Analysis</h5>
                          </div>
                          <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                            <ul style={styles.insightList}>
                              <li style={styles.insightListItem}>
                                <span style={styles.insightBullet}>•</span>
                                <span style={styles.insightText}>
                                  The bubble chart visualization presents the same sentiment data as the word cloud but with enhanced visual representation. Bubble sizes indicate word frequency while colors represent sentiment dominance. 
                                  {comprehensiveSummary.bubbleChart.positiveCount > comprehensiveSummary.bubbleChart.negativeCount 
                                    ? ` Green bubbles (${comprehensiveSummary.bubbleChart.positivePercentage}%) dominate the visualization, indicating positive customer sentiment.`
                                    : comprehensiveSummary.bubbleChart.negativeCount > comprehensiveSummary.bubbleChart.positiveCount
                                    ? ` Red bubbles (${comprehensiveSummary.bubbleChart.negativePercentage}%) are more prominent, suggesting negative customer sentiment.`
                                    : ` The visualization shows balanced sentiment with mixed bubble colors representing diverse customer opinions.`
                                  }
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Bi-gram Analysis */}
                      {comprehensiveSummary.bigramAnalysis && (
                        <div style={styles.insightSection}>
                          <div style={styles.insightHeader}>
                            <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                            <h5 style={styles.insightTitle}>Bi-gram Word Cloud Analysis</h5>
                          </div>
                          <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                            <ul style={styles.insightList}>
                              <li style={styles.insightListItem}>
                                <span style={styles.insightBullet}>•</span>
                                <span style={styles.insightText}>{comprehensiveSummary.bigramAnalysis.summary}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Tri-gram Analysis */}
                      {comprehensiveSummary.trigramAnalysis && (
                        <div style={styles.insightSection}>
                          <div style={styles.insightHeader}>
                            <div style={{...styles.insightIndicator, backgroundColor: '#6b7280'}}></div>
                            <h5 style={styles.insightTitle}>Tri-gram Word Cloud Analysis</h5>
                          </div>
                          <div style={{...styles.insightContent, backgroundColor: '#f3f4f6', borderColor: '#d1d5db'}}>
                            <ul style={styles.insightList}>
                              <li style={styles.insightListItem}>
                                <span style={styles.insightBullet}>•</span>
                                <span style={styles.insightText}>{comprehensiveSummary.trigramAnalysis.summary}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Visualization Tabs */}
          <Card title="Interactive Visualization" subtitle="Explore sentiment words through different views">
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('wordcloud')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'wordcloud'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Word Cloud
                  </button>
                  <button
                    onClick={() => setActiveTab('bubble')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'bubble'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Bubble Chart
                  </button>
                  <button
                    onClick={() => setActiveTab('bigram')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'bigram'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Word Cloud (Bi-gram)
                  </button>
                  <button
                    onClick={() => setActiveTab('trigram')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'trigram'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Word Cloud (Tri-gram)
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'wordcloud' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-black">
                      Interactive word cloud showing qualitative single adjectives
                    </p>
                  </div>
                  <div className="bg-gray-200 rounded-lg p-4 min-h-96">
                    {processedWordData.length > 0 ? (
                      <svg ref={svgRef} className="w-full h-96"></svg>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          <div className="text-4xl text-gray-400 mb-4">☁️</div>
                          <p className="text-gray-500">No qualitative adjectives found in the reviews. Try selecting a different product.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'bubble' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-black">
                      Bubble chart showing qualitative adjectives with size representing frequency and color representing sentiment
                    </p>
                  </div>
                  <div className="bg-gray-200 rounded-lg p-4 min-h-96">
                    {processedWordData.length > 0 ? (
                      <svg ref={bubbleRef} className="w-full h-96"></svg>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          <div className="text-4xl text-gray-400 mb-4">🫧</div>
                          <p className="text-gray-500">No qualitative adjectives found in the reviews. Try selecting a different product.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'bigram' && (
                <div className="space-y-4">
                  <p className="text-sm text-black">
                    Interactive bi-gram word cloud showing meaningful word pairs
                  </p>
                  <div className="bg-gray-200 rounded-lg p-4 min-h-96">
                    {processedBigramData.length > 0 ? (
                      <svg ref={svgRef} className="w-full h-96"></svg>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          {isBigramLoading ? (
                            <>
                              <div className="spinner mx-auto mb-4"></div>
                              <p className="text-gray-500">Processing bi-gram data...</p>
                            </>
                          ) : (
                            <>
                              <div className="text-4xl text-gray-400 mb-4">☁️</div>
                              <p className="text-gray-500">No qualitative bi-grams found in the reviews. Try selecting a different product.</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'trigram' && (
                <div className="space-y-4">
                  <p className="text-sm text-black">
                    Interactive tri-gram word cloud showing meaningful word triplets
                  </p>
                  <div className="bg-gray-200 rounded-lg p-4 min-h-96">
                    {processedTrigramData.length > 0 ? (
                      <svg ref={svgRef} className="w-full h-96"></svg>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          {isTrigramLoading ? (
                            <>
                              <div className="spinner mx-auto mb-4"></div>
                              <p className="text-gray-500">Processing tri-gram data...</p>
                            </>
                          ) : (
                            <>
                              <div className="text-4xl text-gray-400 mb-4">☁️</div>
                              <p className="text-gray-500">No qualitative tri-grams found in the reviews. Try selecting a different product.</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Top 12 Most Frequent Words/Bi-grams/Tri-grams */}
      {!isLoading && !isBigramLoading && !isTrigramLoading && (
        <>
          {/* Show word data when on wordcloud or bubble tab */}
          {(activeTab === 'wordcloud' || activeTab === 'bubble') && processedWordData.length > 0 && (
            <Card title="Most Frequent Words" subtitle="Click on any word to view reviews containing it">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedWordData.slice(0, 12).map((wordData, index) => (
                  <div 
                    key={wordData.word}
                    className="bg-gray-200 rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:bg-gray-100 cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => handleWordClick(wordData.word, wordData.matchingReviews)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      <span className="text-lg font-semibold text-black">{wordData.word}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {wordData.count} times
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 transition-all duration-300"
                          style={{ width: `${wordData.positivePercentage}%` }}
                        />
                        <div 
                          className="bg-red-500 transition-all duration-300"
                          style={{ width: `${wordData.negativePercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-green-600">{wordData.positivePercentage}% Positive</span>
                      <span className="text-red-600">{wordData.negativePercentage}% Negative</span>
                    </div>
                    
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Show bi-gram data when on bigram tab */}
          {activeTab === 'bigram' && processedBigramData.length > 0 && (
            <Card title="Most Frequent Bi-grams" subtitle="Click on any bi-gram to view reviews containing it">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedBigramData.slice(0, 12).map((bigramData, index) => (
                  <div 
                    key={bigramData.word}
                    className="bg-gray-200 rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:bg-gray-100 cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => handleWordClick(bigramData.word, bigramData.matchingReviews)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      <span className="text-base font-semibold text-black text-center flex-1">
                        "{bigramData.word}"
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {bigramData.count} times
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 transition-all duration-300"
                          style={{ width: `${bigramData.positivePercentage}%` }}
                        />
                        <div 
                          className="bg-red-500 transition-all duration-300"
                          style={{ width: `${bigramData.negativePercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-green-600">{bigramData.positivePercentage}% Positive</span>
                      <span className="text-red-600">{bigramData.negativePercentage}% Negative</span>
                    </div>
                    
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Show tri-gram data when on trigram tab */}
          {activeTab === 'trigram' && processedTrigramData.length > 0 && (
            <Card title="Most Frequent Tri-grams" subtitle="Click on any tri-gram to view reviews containing it">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedTrigramData.slice(0, 12).map((trigramData, index) => (
                  <div 
                    key={trigramData.word}
                    className="bg-gray-200 rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:bg-gray-100 cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => handleWordClick(trigramData.word, trigramData.matchingReviews)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      <span className="text-sm font-semibold text-black text-center flex-1">
                        "{trigramData.word}"
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {trigramData.count} times
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 transition-all duration-300"
                          style={{ width: `${trigramData.positivePercentage}%` }}
                        />
                        <div 
                          className="bg-red-500 transition-all duration-300"
                          style={{ width: `${trigramData.negativePercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-green-600">{trigramData.positivePercentage}% Positive</span>
                      <span className="text-red-600">{trigramData.negativePercentage}% Negative</span>
                    </div>
                  
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal for showing word reviews */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-200 rounded-lg max-w-4xl w-full max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-black">
                Reviews containing "{selectedWord}"
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-80">
              {selectedWordReviews.length > 0 ? (
                <div className="space-y-4">
                  {selectedWordReviews.slice(0, 10).map((review, index) => (
                    <div key={index} className="bg-gray-200 rounded-lg p-4">
                                              <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-black">
                            {review.reviewer || 'Anonymous'}
                          </span>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>Rating: {review.rating || 'N/A'}</span>
                          </div>
                        </div>
                      <div className="text-sm text-gray-700">
                        {renderHighlightedText(review.text || review.reviewText || 'No review text available', selectedWord)}
                      </div>
                    </div>
                  ))}
                  {selectedWordReviews.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      And {selectedWordReviews.length - 10} more reviews...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center">No reviews found for this word.</p>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

const styles = {
  insightSection: {
    marginBottom: '24px'
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  insightIndicator: {
    width: '12px',
    height: '12px',
    backgroundColor: '#6b7280',
    borderRadius: '3px'
  },
  insightTitle: {
    fontWeight: '600',
    color: '#111827',
    margin: '0'
  },
  insightContent: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px'
  },
  insightList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  insightListItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  insightBullet: {
    color: '#6b7280',
    marginRight: '8px',
    fontSize: '16px',
    lineHeight: '1.5',
    flexShrink: 0
  },
  insightText: {
    color: '#000000',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0'
  }
};

export default WordCloud; 