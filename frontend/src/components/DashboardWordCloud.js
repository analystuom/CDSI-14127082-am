import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { useWordCloudComplete } from '../hooks/useWordCloudQueries';

const DashboardWordCloud = ({ selectedProduct }) => {
  // Use EXACT same API call as WordCloud.js page
  const {
    wordCloudData,
    reviewsData,
    isLoading,
    isError,
    error
  } = useWordCloudComplete(selectedProduct);

  // Local state - EXACT same as WordCloud page
  const [processedWordData, setProcessedWordData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedWordReviews, setSelectedWordReviews] = useState([]);
  
  const svgRef = useRef();

  // Function to calculate sentiment data for words - EXACT same as WordCloud page
  const calculateWordSentiment = (word, reviews) => {
    const wordLower = word.toLowerCase();
    const matchingReviews = [];
    
    // Find reviews containing the word
    reviews.forEach((review, index) => {
      const reviewText = review.text || review.reviewText || review.review_text || '';
      if (reviewText && reviewText.toLowerCase().includes(wordLower)) {
        matchingReviews.push({
          ...review,
          text: reviewText,
          reviewText: reviewText,
          reviewer: review.reviewer || 'Anonymous',
          rating: review.rating || 'N/A',
          date: review.date || 'Unknown'
        });
      }
    });

    // Calculate sentiment percentages - EXACT same logic as WordCloud page
    let positiveCount = 0;
    let negativeCount = 0;
    
    matchingReviews.forEach(review => {
      const rating = parseFloat(review.rating) || 0;
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

  // Process word cloud data when it changes - EXACT same logic as WordCloud.js page
  useEffect(() => {
    if (wordCloudData?.words && wordCloudData.words.length > 0) {
      console.log('Processing word cloud data from TanStack Query - EXACT same as WordCloud page');
      
      // Convert API format to component format - EXACT same as WordCloud page
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

      // Process with reviews data if available - EXACT same as WordCloud page
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
        // Set basic processed data without sentiment analysis - EXACT same as WordCloud page
        setProcessedWordData(wordCloudFormat.map(item => ({
          ...item,
          positivePercentage: item.sentimentBreakdown?.positive_percentage || 0,
          negativePercentage: item.sentimentBreakdown?.negative_percentage || 0,
          totalSentimentReviews: (item.sentimentBreakdown?.positive || 0) + (item.sentimentBreakdown?.negative || 0),
          matchingReviews: []
        })));
      }
    } else {
      // Reset data when no word cloud data - EXACT same as WordCloud page
      setProcessedWordData([]);
    }
  }, [wordCloudData, reviewsData]);

  // Helper function to create word cloud format from processed data - EXACT same as WordCloud page
  const getWordCloudFormat = () => {
    if (!processedWordData.length) return [];
    return processedWordData.map(item => ({
      text: item.word,
      size: Math.max(10, Math.min(32, (item.count / (processedWordData[0]?.count || 1)) * 32 + 10)), // Smaller sizes for card layout
      count: item.count,
      sentiment: item.sentiment || 'neutral',
      color: item.color || 'gray'
    }));
  };

  // Text highlighting functions - EXACT same logic as WordCloud page
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
        return <strong key={index} className="bg-yellow-200">{part.content}</strong>;
      } else {
        return <span key={index}>{part.content}</span>;
      }
    });
  };

  // Handle word click - EXACT same logic as WordCloud page
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

  // D3 Word Cloud creation - EXACT same as WordCloud page but with smaller dimensions
  const createD3WordCloud = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Responsive dimensions for card layout (smaller than WordCloud page)
    const containerWidth = svgRef.current.parentElement?.clientWidth || 400;
    const width = Math.min(containerWidth - 40, 450); // Max 450px, with more padding
    const height = 280; // Optimized height for card layout
    const wordData = getWordCloudFormat();
    
    if (wordData.length === 0) return;
    
    // Create color mapping for sentiment-based coloring - EXACT same as WordCloud page
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
      .padding(5) // Same padding as WordCloud page
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
        .style("font-weight", d => d.size > 20 ? "bold" : "normal") // Adjusted for smaller sizes
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
        });

      text
        .on("click", function(event, d) {
          // Find the matching processed word data
          const processedWord = processedWordData.find(w => w.word === d.text);
          handleWordClick(d.text, processedWord?.matchingReviews || []);
        });

      text
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .style("opacity", 1);
    }
  };

  // Use effects for creating visualizations - EXACT same as WordCloud page
  useEffect(() => {
    if (processedWordData.length > 0) {
      createD3WordCloud();
    }
  }, [processedWordData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-black">Word Cloud</h3>
          <p className="text-sm text-black">Most frequently mentioned words in reviews</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-600 text-sm">Loading word cloud...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-black">Word Cloud</h3>
          <p className="text-sm text-black">Most frequently mentioned words in reviews</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-red-400 mb-2">⚠️</div>
            <p className="text-red-500 text-sm">Error loading word cloud</p>
            <p className="text-gray-500 text-xs mt-1">{error?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!processedWordData || processedWordData.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-black">Word Cloud</h3>
          <p className="text-sm text-black">Most frequently mentioned words in reviews</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-gray-400 mb-2">☁️</div>
            <p className="text-gray-500 text-sm">No word cloud data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-black">Word Cloud</h3>
        <p className="text-sm text-black">Most frequently mentioned words in reviews</p>
      </div>

      {/* Word Cloud Visualization */}
      <div className="flex-1 flex items-center justify-center bg-gray-200 rounded-lg p-2 min-h-0">
        <svg ref={svgRef} className="max-w-full max-h-full"></svg>
      </div>

      {/* Modal for word details - EXACT same as WordCloud page */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-hidden">
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
                    <div key={index} className="bg-gray-100 rounded-lg p-4">
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
    </div>
  );
};

export default DashboardWordCloud;