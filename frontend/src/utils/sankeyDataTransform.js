/**
 * Transform API response data into D3 Sankey chart format
 * @param {Object} sankeyData - Raw sankey data from API
 * @returns {Object} - Formatted data for D3 Sankey chart
 */
export const transformSankeyData = (sankeyData) => {
  if (!sankeyData || !sankeyData.total_reviews) {
    return {
      nodes: [],
      links: []
    };
  }

  const {
    total_reviews,
    positive_sentiment_count,
    neutral_sentiment_count,
    negative_sentiment_count,
    positive_emotions,
    negative_emotions
  } = sankeyData;

  // Create nodes array with numeric IDs (like CodeSandbox example)
  const nodes = [];
  let nodeIdCounter = 0;
  
  // Create a mapping from string IDs to numeric IDs
  const idMapping = {};
  
  // Root node - Total Reviews
  const totalReviewsId = nodeIdCounter++;
  idMapping['total_reviews'] = totalReviewsId;
  nodes.push({
    id: totalReviewsId,
    name: `Total Reviews (${total_reviews.toLocaleString()})`,
    category: 'total',
    value: total_reviews
  });

  // Sentiment nodes
  let positiveSentimentId, neutralSentimentId, negativeSentimentId;
  
  if (positive_sentiment_count > 0) {
    positiveSentimentId = nodeIdCounter++;
    idMapping['positive_sentiment'] = positiveSentimentId;
    nodes.push({
      id: positiveSentimentId,
      name: `Positive Sentiment (${positive_sentiment_count.toLocaleString()})`,
      category: 'positive_sentiment',
      value: positive_sentiment_count
    });
  }

  if (neutral_sentiment_count > 0) {
    neutralSentimentId = nodeIdCounter++;
    idMapping['neutral_sentiment'] = neutralSentimentId;
    nodes.push({
      id: neutralSentimentId,
      name: `Neutral Sentiment (${neutral_sentiment_count.toLocaleString()})`,
      category: 'neutral_sentiment',
      value: neutral_sentiment_count
    });
  }

  if (negative_sentiment_count > 0) {
    negativeSentimentId = nodeIdCounter++;
    idMapping['negative_sentiment'] = negativeSentimentId;
    nodes.push({
      id: negativeSentimentId,
      name: `Negative Sentiment (${negative_sentiment_count.toLocaleString()})`,
      category: 'negative_sentiment',
      value: negative_sentiment_count
    });
  }

  // Add positive emotions first (will appear in upper section naturally)
  const positiveEmotionEntries = Object.entries(positive_emotions || {})
    .filter(([emotion, count]) => count > 0)
    .sort(([,a], [,b]) => b - a); // Sort by count descending
    
  positiveEmotionEntries.forEach(([emotion, count]) => {
    const emotionId = nodeIdCounter++;
    const emotionKey = `emotion_${emotion}`;
    idMapping[emotionKey] = emotionId;
    nodes.push({
      id: emotionId,
      name: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} (${count.toLocaleString()})`,
      category: 'positive_emotion',
      value: count,
      emotion: emotion
    });
  });

  // Add negative emotions after (will appear in lower section naturally)
  const negativeEmotionEntries = Object.entries(negative_emotions || {})
    .filter(([emotion, count]) => count > 0)
    .sort(([,a], [,b]) => b - a); // Sort by count descending
    
  negativeEmotionEntries.forEach(([emotion, count]) => {
    const emotionId = nodeIdCounter++;
    const emotionKey = `emotion_${emotion}`;
    idMapping[emotionKey] = emotionId;
    nodes.push({
      id: emotionId,
      name: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} (${count.toLocaleString()})`,
      category: 'negative_emotion',
      value: count,
      emotion: emotion
    });
  });

  // Create links array using numeric IDs
  const links = [];

  // Links from total reviews to sentiment categories
  if (positive_sentiment_count > 0) {
    links.push({
      source: idMapping['total_reviews'],
      target: idMapping['positive_sentiment'],
      value: positive_sentiment_count
    });
  }

  if (neutral_sentiment_count > 0) {
    links.push({
      source: idMapping['total_reviews'],
      target: idMapping['neutral_sentiment'],
      value: neutral_sentiment_count
    });
  }

  if (negative_sentiment_count > 0) {
    links.push({
      source: idMapping['total_reviews'],
      target: idMapping['negative_sentiment'],
      value: negative_sentiment_count
    });
  }

  // Links from sentiment categories to specific emotions
  Object.entries(positive_emotions || {}).forEach(([emotion, count]) => {
    if (count > 0) {
      const emotionKey = `emotion_${emotion}`;
      if (idMapping['positive_sentiment'] !== undefined && idMapping[emotionKey] !== undefined) {
        links.push({
          source: idMapping['positive_sentiment'],
          target: idMapping[emotionKey],
          value: count
        });
      }
    }
  });

  Object.entries(negative_emotions || {}).forEach(([emotion, count]) => {
    if (count > 0) {
      const emotionKey = `emotion_${emotion}`;
      if (idMapping['negative_sentiment'] !== undefined && idMapping[emotionKey] !== undefined) {
        links.push({
          source: idMapping['negative_sentiment'],
          target: idMapping[emotionKey],
          value: count
        });
      }
    }
  });

  // Implement reverse calculation for proper flow conservation
  // Start from emotion nodes (leaf nodes) and work backwards
  
  // Step 1: Emotion nodes keep their original values (they are the source of truth)
  // No changes needed for emotion nodes
  
  // Step 2: Calculate Positive and Negative Sentiment node values
  // by summing their respective emotion node values
  let totalPositiveEmotionValue = 0;
  let totalNegativeEmotionValue = 0;
  
  // Sum up all positive emotion values
  Object.entries(positive_emotions || {}).forEach(([emotion, count]) => {
    if (count > 0) {
      totalPositiveEmotionValue += count;
    }
  });
  
  // Sum up all negative emotion values
  Object.entries(negative_emotions || {}).forEach(([emotion, count]) => {
    if (count > 0) {
      totalNegativeEmotionValue += count;
    }
  });
  
  // Step 3: Update sentiment node values to match their emotion totals
  nodes.forEach(node => {
    if (node.category === 'positive_sentiment') {
      node.value = totalPositiveEmotionValue;
      // Update the display name to reflect the calculated value
      node.name = `Positive Sentiment (${totalPositiveEmotionValue.toLocaleString()})`;
    } else if (node.category === 'negative_sentiment') {
      node.value = totalNegativeEmotionValue;
      // Update the display name to reflect the calculated value
      node.name = `Negative Sentiment (${totalNegativeEmotionValue.toLocaleString()})`;
    } else if (node.category === 'neutral_sentiment') {
      // Neutral sentiment keeps its original value (no emotions to sum)
      // Value is already set correctly from the API data
    } else if (node.category === 'total') {
      // Step 4: Total Reviews node value = sum of sentiment node values
      const calculatedTotal = totalPositiveEmotionValue + totalNegativeEmotionValue + (neutral_sentiment_count || 0);
      node.value = calculatedTotal;
      // Update the display name to reflect the calculated value
      node.name = `Total Reviews (${calculatedTotal.toLocaleString()})`;
    }
  });
  
  // Step 5: Update link values to match the new node values
  links.forEach(link => {
    // Find the source and target nodes
    const sourceNode = nodes.find(n => n.id === link.source);
    const targetNode = nodes.find(n => n.id === link.target);
    
    if (sourceNode && targetNode) {
      // For links from total to sentiment: use sentiment node value
      if (sourceNode.category === 'total' && targetNode.category.includes('sentiment')) {
        link.value = targetNode.value;
      }
      // For links from sentiment to emotion: keep original emotion value
      // (these are already correct from the API data)
    }
  });

  return {
    nodes,
    links
  };
};

/**
 * Get color for a node based on its category
 * @param {string} category - Node category
 * @returns {string} - Color hex code
 */
export const getNodeColor = (category) => {
  const colors = {
    total: '#3B82F6',           // Blue
    positive_sentiment: '#10B981', // Green
    neutral_sentiment: '#6B7280',  // Gray
    negative_sentiment: '#EF4444', // Red
    positive_emotion: '#34D399',    // Light green
    negative_emotion: '#F87171'     // Light red
  };
  
  return colors[category] || '#6B7280'; // Default gray
};

/**
 * Get link color based on source and target categories
 * @param {Object} link - Link object with source and target
 * @param {Array} nodes - Array of nodes to determine categories
 * @returns {string} - Color hex code with opacity
 */
export const getLinkColor = (link, nodes) => {
  const sourceNode = nodes.find(n => n.id === link.source.id || n.id === link.source);
  const targetNode = nodes.find(n => n.id === link.target.id || n.id === link.target);
  
  if (!sourceNode || !targetNode) return 'rgba(107, 114, 128, 0.6)';
  
  // Use target color for link color
  const baseColor = getNodeColor(targetNode.category);
  
  // Convert hex to rgba with opacity
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, 0.6)`;
};
