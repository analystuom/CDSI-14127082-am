import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import {
  DashboardIcon,
  ProductIcon,
  WordCloudIcon,
  ComparisonIcon,
  TimelineIcon,
  HexagonIcon,
  MapIcon,
  ProfileIcon,
  AdminIcon
} from '../components/Icons';

const StartingProfessional = () => {
  const { user, isAdmin } = useAuth();

  const navigationItems = [
    {
      name: 'Product Analysis',
      description: 'Get detailed sentiment insights for individual products',
      path: '/product',
      icon: ProductIcon,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      name: 'Word Cloud',
      description: 'Visualize frequently mentioned keywords',
      path: '/wordcloud',
      icon: WordCloudIcon,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      name: 'Comparison',
      description: 'Compare multiple products',
      path: '/productcomparison',
      icon: ComparisonIcon,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      name: 'Timeline',
      description: 'Track sentiment over time',
      path: '/sentimenttimeline',
      icon: TimelineIcon,
      color: 'text-green-600 bg-green-100'
    },
    {
      name: 'Hexagon',
      description: 'Advanced sentiment visualization',
      path: '/sentimenthexagon',
      icon: HexagonIcon,
      color: 'text-indigo-600 bg-indigo-100'
    },

    {
      name: 'Sentiment Map',
      description: 'Geographic sentiment view',
      path: '/sentimentmap',
      icon: MapIcon,
      color: 'text-teal-600 bg-teal-100'
    },
    {
      name: 'Profile',
      description: 'Account settings',
      path: '/profile',
      icon: ProfileIcon,
      color: 'text-gray-600 bg-gray-100'
    }
  ];

  // Add admin panel if user is admin
  if (isAdmin()) {
    navigationItems.push({
      name: 'Admin',
      description: 'System management',
      path: '/admin',
      icon: AdminIcon,
      color: 'text-red-600 bg-red-100'
    });
  }

  return (
    <div className="pl-6 pr-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Pulsar Analytics for Professional Users
        </h1>
        
        <p className="text-gray-600 text-lg leading-relaxed">
          We help you conduct sentiment analysis and derive insights from customer reviews with comprehensive tools and features.
        </p>
      </div>

      {/* Try things out Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Try things out</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Card - Start Analysis */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                <img 
                  src="/getting-started1.png" 
                  alt="Select a product to analyze" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Select a product to analyze
            </h3>
            
            <p className="text-gray-600 mb-6">
              Set up with relevant information such as product data
            </p>
            
            <div className="flex items-center justify-between">
              <a 
                href="/product" 
                className="text-gray-700 hover:text-gray-900 font-medium flex items-center"
              >
                Learn more 
                <span className="ml-1">›</span>
              </a>
              <a 
                href="/product" 
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              >
                Start
              </a>
            </div>
          </div>

          {/* Second Card - Create Visualizations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                <img 
                  src="/getting-started2.png" 
                  alt="Conduct sentiment analysis" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>           
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Conduct sentiment analysis
            </h3>
            
            <p className="text-gray-600 mb-6">
              Proceed to diffrent designated visualizations for the selected product
            </p>
            
            <div className="flex items-center justify-between">
              <a 
                href="/wordcloud" 
                className="text-gray-700 hover:text-gray-900 font-medium flex items-center"
              >
                Learn more 
                <span className="ml-1">›</span>
              </a>
              <a 
                href="/wordcloud" 
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              >
                Create
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access to All Tools */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Analysis Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {navigationItems.filter(item => item.name !== 'Admin').map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={index}
                href={item.path}
                className="flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all duration-200 group"
              >
                <div className={`w-8 h-8 rounded ${item.color} flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {item.name.replace(' Analysis', '').replace(' and ', ' & ')}
                </span>
              </a>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default StartingProfessional;
