import React from 'react';

const Card = ({ 
  children, 
  className = "", 
  title, 
  subtitle, 
  headerAction,
  noPadding = false 
}) => {
  return (
    <div className={`dashboard-card ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-400">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-black">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-black mt-1">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className={noPadding ? '-m-6' : ''}>
        {children}
      </div>
    </div>
  );
};

export default Card; 