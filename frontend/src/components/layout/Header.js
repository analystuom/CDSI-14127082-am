import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProductSelection } from '../../contexts/ProductSelectionContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { MenuIcon, NotificationIcon, ChevronDownIcon, LogoutIcon, ProfileIcon } from '../Icons';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { hasSelection, getSelectedProductTitle } = useProductSelection();
  const { toggleMobileSidebar, toggleSidebar } = useSidebar();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsUserDropdownOpen(false);
  };

  return (
    <header className="bg-gray-50 shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left side - Mobile menu button and logo */}
        <div className="flex items-center space-x-4">
          {/* Mobile sidebar toggle */}
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <MenuIcon />
          </button>
          
          {/* Desktop sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:block p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Toggle Sidebar"
          >
            <MenuIcon />
          </button>
          
          <div className="hidden md:block">
          </div>
        </div>

        {/* Right side - User dropdown and product selection */}
        <div className="flex items-center space-x-3">
          {/* Selected Product Indicator */}
          {hasSelection && (
            <div className="hidden md:flex items-center bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded text-xs">
              <span className="font-medium">
                Selected: {(() => {
                  const title = getSelectedProductTitle();
                  return title?.length > 12 ? title.substring(0, 12) + '...' : title;
                })()}
              </span>
            </div>
          )}

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <ProfileIcon className="w-4 h-4 text-primary-600" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {user?.username}
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {user?.role}
                </div>
              </div>
              <ChevronDownIcon className="text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsUserDropdownOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.username}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                      {user?.role} Account
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <ProfileIcon className="w-4 h-4 mr-3" />
                    View Profile
                  </button>         
                  
                  <div className="border-t border-gray-200 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogoutIcon className="w-4 h-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 