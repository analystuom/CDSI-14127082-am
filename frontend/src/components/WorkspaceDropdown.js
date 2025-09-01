import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from './Icons';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

const WorkspaceDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredWorkspace, setHoveredWorkspace] = useState(null);
  const { selectedWorkspace, workspaces, selectWorkspace } = useWorkspace();
  const { isAdmin } = useAuth();

  const isWorkspaceAccessible = (workspaceName) => {
    if (workspaceName === 'Professional User') {
      return isAdmin();
    }
    return true;
  };

  // Safety check: If non-admin user has Professional User selected, switch to General User
  useEffect(() => {
    if (selectedWorkspace === 'Professional User' && !isAdmin()) {
      selectWorkspace('General User');
    }
  }, [selectedWorkspace, isAdmin, selectWorkspace]);

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 bg-gray-950 border border-gray-700 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors"
      >
        <div className="flex-1">
          <div className="text-gray-400 text-xs">Workspace</div>
          <div className="text-white text-sm font-medium">
            {selectedWorkspace}
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-950 border border-gray-700 rounded-xl shadow-lg z-20">
            {workspaces.map((workspace) => {
              const isAccessible = isWorkspaceAccessible(workspace.name);
              const isSelected = workspace.name === selectedWorkspace;
              
              return (
                <div
                  key={workspace.name}
                  onClick={() => {
                    if (isAccessible) {
                      setIsOpen(false);
                      selectWorkspace(workspace.name);
                    }
                  }}
                  onMouseEnter={() => setHoveredWorkspace(workspace.name)}
                  onMouseLeave={() => setHoveredWorkspace(null)}
                  className={`relative flex items-center space-x-3 p-3 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    isAccessible 
                      ? `cursor-pointer hover:bg-gray-800 ${isSelected ? 'bg-gray-800' : ''}` 
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isAccessible ? 'bg-orange-500' : 'bg-gray-600'
                  }`}>
                    <span className="text-white font-bold text-sm">
                      {workspace.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      isAccessible ? 'text-white' : 'text-gray-500'
                    }`}>
                      {workspace.name}
                    </div>
                  </div>
                  {isSelected && isAccessible && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}

                  {/* Tooltip for restricted access */}
                  {!isAccessible && hoveredWorkspace === workspace.name && (
                    <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-30">
                      You need a professional account to access the items in this category
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceDropdown;
