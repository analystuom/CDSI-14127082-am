import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import WorkspaceDropdown from '../WorkspaceDropdown';
import {
  DashboardIcon,
  ProductIcon,
  WordCloudIcon,
  ComparisonIcon,
  TimelineIcon,
  HexagonIcon,
  OpinionToneIcon,
  MapIcon,
  FeedbackIcon,
  AdminIcon,
  CloseIcon,
  SearchIcon
} from '../Icons';

const Sidebar = () => {
  const { isAdmin } = useAuth();
  const { isMobileOpen, isExpanded, closeMobileSidebar } = useSidebar();
  const { selectedWorkspace } = useWorkspace();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Define navigation items based on workspace
  const getNavigationItems = () => {
    if (selectedWorkspace === 'Professional User') {
      const items = [
        {
          name: 'Professional Guidance',
          path: '/gettingstartprofessional',
          icon: DashboardIcon,
        },
        {
          name: 'Product Selection',
          path: '/product',
          icon: ProductIcon,
        },
        {
          name: 'Opinion and Tone',
          path: '/opinionandtone',
          icon: OpinionToneIcon,
        },
        {
          name: 'Product Dashboard',
          path: '/productdashboard',
          icon: SearchIcon,
        },
        {
          name: 'Comparison Dashboard',
          path: '/comparisondashboard',
          icon: ComparisonIcon,
        },
        {
          name: 'User Feedback',
          path: '/feedback',
          icon: FeedbackIcon,
        }
      ];

      return items;
    }

    // Default items for General User
    const items = [
      {
        name: 'Getting Started',
        path: '/gettingstart',
        icon: DashboardIcon,
      },
      {
        name: 'Product Selection',
        path: '/product',
        icon: ProductIcon,
      },
      {
        name: 'Word Cloud',
        path: '/wordcloud',
        icon: WordCloudIcon,
      },
      {
        name: 'Sentiment Timeline',
        path: '/sentimenttimeline',
        icon: TimelineIcon,
      },
      {
        name: 'Product Comparison',
        path: '/productcomparison',
        icon: ComparisonIcon,
      },
      {
        name: 'Sentiment Heatmap',
        path: '/sentimenthexagon',
        icon: HexagonIcon,
      },
      {
        name: 'Sentiment Map',
        path: '/sentimentmap',
        icon: MapIcon,
      },
      {
        name: 'User Feedback',
        path: '/feedback',
        icon: FeedbackIcon,
      },
    ];

    return items;
  };

  const navigationItems = getNavigationItems();

  const sidebarWidth = isExpanded ? 'w-[280px]' : 'w-20';

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar - Always fixed for sticky behavior */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen bg-gray-950 border-r border-gray-700 
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarWidth}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand Section */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className={`flex items-center space-x-3 ${!isExpanded ? 'lg:justify-center' : ''}`}>
              {/* Logo - always present to prevent re-rendering */}
              <img src="/logo-pulsar.png" alt="Pulsar" className="w-12 h-12 flex-shrink-0" />
              {/* Brand Name - only show when expanded */}
              {isExpanded && (
                <h2 className="text-xl font-bold text-white">Pulsar Analytics</h2>
              )}
            </div>
            
            {/* Mobile close button */}
            <button
              onClick={closeMobileSidebar}
              className="lg:hidden p-1 rounded-lg text-white hover:text-white hover:bg-gray-800"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace Dropdown - Only show when expanded */}
          {isExpanded && (
            <div className="p-4">
              <WorkspaceDropdown />
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-700"></div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileSidebar}
                    className={`
                      flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200
                      ${active 
                        ? 'bg-primary-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                      ${!isExpanded ? 'lg:justify-center lg:px-2' : ''}
                    `}
                    title={!isExpanded ? item.name : ''}
                  >
                    <Icon className={`w-6 h-6 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                    {isExpanded && (
                      <span className="ml-3 hidden lg:block">{item.name}</span>
                    )}
                    <span className="ml-3 lg:hidden">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom section - User info or toggle button */}
          <div className="p-4 border-t border-gray-700">
            <div className="text-center">
              <div className={`text-xs text-gray-400 ${!isExpanded ? 'lg:hidden' : ''}`}>
                <p>Pulsar Analytics Platform</p>
                <p>@Mike UoM</p>
              </div>

            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 