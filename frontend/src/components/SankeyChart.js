import React, { useMemo } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyCenter } from 'd3-sankey';
import { transformSankeyData, getNodeColor } from '../utils/sankeyDataTransform';

const SankeyChart = ({ 
  data, 
  width = 800, 
  height = 500, 
  className = "",
  onError = null 
}) => {
  // Margins for the chart
  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 180; // Further increased right margin to accommodate longer emotion labels
  const MARGIN_Y = 50;

  // Process the data and generate the Sankey layout
  const { allNodes, allLinks, error } = useMemo(() => {
    if (!data) {
      return { allNodes: [], allLinks: [], error: 'No data provided' };
    }

    try {
      // Transform data for D3 Sankey
      const sankeyData = transformSankeyData(data);
      
      if (!sankeyData.nodes.length || !sankeyData.links.length) {
        return { allNodes: [], allLinks: [], error: 'No data available for Sankey chart' };
      }

      // Create Sankey generator with proper flow conservation
      const sankeyGenerator = sankey()
        .nodeWidth(20.5)  // Wider nodes like Google Charts
        .nodePadding(8.5) // Tighter padding for better flow visualization
        .extent([
          [MARGIN_LEFT, MARGIN_Y],
          [width - MARGIN_RIGHT, height - MARGIN_Y],
        ])
        .nodeId((node) => node.id)
        .nodeAlign(sankeyCenter)
        .iterations(50); // More iterations for better flow conservation

      // Prepare data (d3-sankey modifies the original objects)
      const sankeyNodes = sankeyData.nodes.map(d => ({ ...d }));
      const sankeyLinks = sankeyData.links.map(d => ({ ...d }));
      
      // Generate the Sankey layout
      const { nodes, links } = sankeyGenerator({
        nodes: sankeyNodes,
        links: sankeyLinks
      });

      // Render nodes as React elements with improved styling
      const allNodes = nodes.map((node, i) => {
        const nodeHeight = node.y1 - node.y0;
        const nodeWidth = node.x1 - node.x0;
        
        return (
          <g key={i} transform={`translate(${node.x0}, ${node.y0})`}>
            <rect
              height={nodeHeight}
              width={nodeWidth}
              fill={getNodeColor(node.category)}
              stroke="none" // Remove border for cleaner look like Google Charts
              opacity={0.9} // Higher opacity for better visibility
              rx={2} // Slight border radius for modern look
              style={{ cursor: 'pointer' }}
            >
              <title>{`${node.name}\nValue: ${node.value?.toLocaleString() || 'N/A'}`}</title>
            </rect>
            <text
              x={node.category === 'positive_emotion' || node.category === 'negative_emotion' ? nodeWidth + 8 : (node.x0 < width / 2 ? nodeWidth + 8 : -8)} // Position emotion labels after their nodes
              y={nodeHeight / 2}
              dy="0.35em"
              textAnchor={node.category === 'positive_emotion' || node.category === 'negative_emotion' ? 'start' : (node.x0 < width / 2 ? 'start' : 'end')}
              fontSize="11px" // Reduced font size for better visibility
              fontWeight="600" // Bolder text
              fill="#374151"
              style={{ pointerEvents: 'none' }} // Prevent text from blocking hover
            >
              {node.name.length > 30 ? node.name.substring(0, 30) + '...' : node.name}
            </text>
          </g>
        );
      });

      // Render links as React elements with thickness matching target node height
      const allLinks = links.map((link, i) => {
        // Validate link has proper source and target
        if (!link.source || !link.target || typeof link.width === 'undefined') {
          return null;
        }

        // Generate the path using sankeyLinkHorizontal
        const linkGenerator = sankeyLinkHorizontal();
        const path = linkGenerator(link);
        
        if (!path) {
          return null;
        }
        
        // Use the link width calculated by d3-sankey (which matches node heights)
        // This ensures link thickness perfectly matches the target node height
        const thickness = Math.max(1, link.width);
        
        // Determine gradient color based on flow direction (positive vs negative)
        let linkColor = '#9CA3AF'; // Default gray
        
        if (link.target && link.source) {
          // Positive flow: Total → Positive Sentiment → Positive Emotions
          if (link.target.category === 'positive_sentiment' || 
              (link.source.category === 'positive_sentiment' && link.target.category === 'positive_emotion')) {
            linkColor = '#86EFAC'; // Light green for positive flows
          }
          // Negative flow: Total → Negative Sentiment → Negative Emotions  
          else if (link.target.category === 'negative_sentiment' || 
                   (link.source.category === 'negative_sentiment' && link.target.category === 'negative_emotion')) {
            linkColor = '#FCA5A5'; // Light red for negative flows
          }
        }

        return (
          <path
            key={i}
            d={path}
            stroke={linkColor}
            fill="none"
            strokeOpacity={0.8} // Higher opacity for better visibility of gradient colors
            strokeWidth={thickness} // Use d3-sankey calculated width (matches node height)
            style={{ cursor: 'pointer' }}
          >
            <title>
              {`${link.source.name} → ${link.target.name}\nValue: ${link.value.toLocaleString()}`}
            </title>
          </path>
        );
      }).filter(Boolean); // Remove null entries

      return { allNodes, allLinks, error: null };

    } catch (err) {
      console.error('Error processing Sankey data:', err);
      const errorMessage = err.message || 'Failed to process Sankey data';
      if (onError) onError(err);
      return { allNodes: [], allLinks: [], error: errorMessage };
    }
  }, [data, width, height, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_Y, onError]);

  // Handle error state
  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center text-red-600">
          <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Handle no data state
  if (!allNodes.length || !allLinks.length) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center text-gray-500">
          <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No data available for Sankey chart</p>
        </div>
      </div>
    );
  }

  // Render the Sankey chart using React (following CodeSandbox pattern exactly)
  return (
    <div className={`sankey-chart-container ${className}`}>
      <svg width={width} height={height}>
        {/* Render links first (so they appear behind nodes) */}
        <g className="links">
          {allLinks}
        </g>
        
        {/* Render nodes on top */}
        <g className="nodes">
          {allNodes}
        </g>
      </svg>
    </div>
  );
};

export default SankeyChart;