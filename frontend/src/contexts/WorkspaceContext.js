import React, { createContext, useContext, useState } from 'react';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const [selectedWorkspace, setSelectedWorkspace] = useState('General User');

  const workspaces = [
    { name: 'General User', logo: '/logo.svg' },
    { name: 'Professional User', logo: '/logo.svg' },
  ];

  const selectWorkspace = (workspaceName) => {
    setSelectedWorkspace(workspaceName);
  };

  const value = {
    selectedWorkspace,
    workspaces,
    selectWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
