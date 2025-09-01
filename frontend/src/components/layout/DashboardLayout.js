import React, { useState, useEffect } from 'react';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { ProductSelectionProvider, useProductSelection } from '../../contexts/ProductSelectionContext';
import { useProductCategories } from '../../hooks/useProductQueries';
import Header from './Header';
import Sidebar from './Sidebar';

const DashboardContent = ({ children }) => {
  const { isExpanded, isMobileOpen } = useSidebar();
  const { selectedProduct, setCategories } = useProductSelection();
  
  // Fetch categories when dashboard loads and store them in context
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useProductCategories();
  
  useEffect(() => {
    if (categoriesData?.categories) {
      setCategories(categoriesData.categories);
    }
  }, [categoriesData, setCategories]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area - with left margin to account for fixed sidebar */}
      <div className={`
        flex flex-col min-h-screen transition-all duration-300 ease-in-out
        ${isExpanded ? 'lg:ml-[280px]' : 'lg:ml-20'}
      `}>
        {/* Header */}
        <Header />
        
        {/* Page content - minimal padding, no centering */}
        <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {/* Pass selectedProduct to all children */}
          {React.Children.map(children, child => 
            React.isValidElement(child) 
              ? React.cloneElement(child, { selectedProduct }) 
              : child
          )}
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children }) => {
  return (
    <ProductSelectionProvider>
      <SidebarProvider>
        <DashboardContent>
          {children}
        </DashboardContent>
      </SidebarProvider>
    </ProductSelectionProvider>
  );
};

export default DashboardLayout; 