import React, { useState, useEffect, useMemo, useRef } from 'react';

const CalendarHeatmap = ({ data }) => {
  const [selectedYears, setSelectedYears] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const dropdownRef = useRef(null);

  // Get all unique years from the data and sort them in descending order (memoized for performance)
  const allYears = useMemo(() => {
    return data && data.length > 0 ? [...new Set(data.map(d => new Date(d.date).getFullYear()))].sort((a, b) => b - a) : [];
  }, [data]);
  
  // Set default selected years to the latest 2 years ONLY on initial load
  useEffect(() => {
    if (allYears.length > 0 && !hasInitialized) {
      // Default to latest 2 years (since allYears is now in descending order, take first 2)
      const defaultYears = allYears.length >= 2 
        ? allYears.slice(0, 2) 
        : allYears;
      setSelectedYears(defaultYears);
      setHasInitialized(true);
    }
  }, [allYears, hasInitialized]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-black">No calendar data available</div>
      </div>
    );
  }
  
  // Filter data based on selected years and sort in descending order
  const years = selectedYears.length > 0 
    ? [...selectedYears].sort((a, b) => b - a) 
    : [];
  
  // Months array for header
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // Days of week for left labels (matching reference image)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Create a map for quick lookup of scores by date
  const scoreMap = {};
  data.forEach(item => {
    scoreMap[item.date] = item.score;
  });

  // Function to get color based on score
  const getColor = (score) => {
    if (score === undefined || score === null || score === 0) {
      return '#ebedf0'; // Light gray for no data or neutral (GitHub style)
    }
    if (score > 0) {
      return '#10b981'; // Green for positive
    } else {
      return '#ef4444'; // Red for negative
    }
  };

  // Function to get weeks in a year starting from the first Sunday
  const getWeeksInYear = (year) => {
    const weeks = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Find the first Sunday of the year (or before if year doesn't start on Sunday)
    const firstDay = new Date(startDate);
    const dayOfWeek = firstDay.getDay();
    if (dayOfWeek !== 0) {
      firstDay.setDate(firstDay.getDate() - dayOfWeek);
    }

    let currentDate = new Date(firstDay);
    
    while (currentDate <= endDate || currentDate.getFullYear() === year) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const cellDate = new Date(currentDate);
        const dateStr = cellDate.toISOString().split('T')[0];
        const isCurrentYear = cellDate.getFullYear() === year;
        
        week.push({
          date: dateStr,
          score: scoreMap[dateStr],
          isCurrentYear,
          day: cellDate.getDate(),
          month: cellDate.getMonth()
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
      
      // Break if we've gone well past the year
      if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) break;
    }
    
    return weeks;
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* Year Selection Interface */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">
              Select Years:
            </label>
            
            {/* Multi-Select Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsDropdownOpen(!isDropdownOpen);
                  }
                }}
                className="flex items-center justify-between w-64 px-3 py-2 text-left bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm hover:border-gray-400 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <span className="truncate">
                  {selectedYears.length === 0 
                    ? 'No years selected - click to choose' 
                    : selectedYears.length === allYears.length 
                      ? 'All years selected'
                      : `${selectedYears.length} years selected`}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-gray-200 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {/* Quick Actions */}
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-200">
                    <div className="flex items-center justify-between text-xs space-x-2">
                      <button
                        onClick={() => {
                          setSelectedYears(allYears);
                          setIsDropdownOpen(false);
                        }}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                        disabled={selectedYears.length === allYears.length}
                      >
                        All Years
                      </button>
                      <button
                        onClick={() => {
                          setSelectedYears(allYears.length >= 2 ? allYears.slice(0, 2) : allYears);
                          setIsDropdownOpen(false);
                        }}
                        className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-700 transition-colors"
                      >
                        Latest 2
                      </button>
                      <button
                        onClick={() => {
                          setSelectedYears([]);
                          setIsDropdownOpen(false);
                        }}
                        className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700 transition-colors"
                        disabled={selectedYears.length === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  {/* Year Options */}
                  <div className="py-1">
                    {allYears.map(year => (
                      <div
                        key={year}
                        className="flex items-center px-3 py-2 hover:bg-gray-200 cursor-pointer"
                        onClick={() => {
                          if (selectedYears.includes(year)) {
                            setSelectedYears(prev => prev.filter(y => y !== year));
                          } else {
                            setSelectedYears(prev => [...prev, year].sort((a, b) => b - a));
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedYears.includes(year)}
                          onChange={() => {}} // Handled by div onClick
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{year}</span>
                          <span className="text-xs text-black">
                            {data.filter(d => new Date(d.date).getFullYear() === year).length} days
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selection Counter */}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              selectedYears.length === 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {selectedYears.length === 0 
                ? `None of ${allYears.length} selected` 
                : `${selectedYears.length} of ${allYears.length} selected`}
            </span>
          </div>
          
          {/* Year Statistics */}
          <div className="text-sm text-black">
            {selectedYears.length === allYears.length ? (
              <span>
                {allYears.length > 0 
                  ? `Showing all ${allYears.length} years (${allYears[allYears.length - 1]} - ${allYears[0]})` 
                  : 'No years available'}
              </span>
            ) : selectedYears.length > 0 ? (
              <span>
                Showing {selectedYears.length} years: {[...selectedYears].sort((a, b) => b - a).join(', ')}
              </span>
            ) : (
              <span>No years selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Calendar grid for each year */}
      {selectedYears.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="max-w-md mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">No Years Selected</h3>
              <p className="text-black mb-4">
                Please select at least one year from the dropdown above to view the sentiment calendar data.
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Use the "Latest 2" button for a quick start</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        years.map(year => {
        const weeks = getWeeksInYear(year);
        
        return (
          <div key={year} className="mb-12 last:mb-8">
            {/* Year header */}
            <div className="mb-4 pb-2 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 text-center">{year}</h3>
              <div className="text-xs text-black text-center mt-1">
                {data.filter(d => new Date(d.date).getFullYear() === year).length} days with reviews
              </div>
            </div>
            
            {/* Month headers */}
            <div className="flex mb-2">
              <div className="w-20"></div> {/* Space for day labels */}
              <div className="flex-1 grid grid-cols-12 gap-1 text-xs text-black font-medium">
                {months.map(month => (
                  <div key={month} className="text-center">
                    {month}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Calendar grid */}
            <div className="flex">
              {/* Day of week labels */}
              <div className="w-20 flex flex-col justify-between text-xs text-black">
                {daysOfWeek.map((day, index) => (
                  <div key={day} className="h-3 flex items-center justify-end pr-2" style={{ marginBottom: '2px' }}>
                    {index % 2 === 0 ? day : ''}
                  </div>
                ))}
              </div>
              
              {/* Calendar weeks */}
              <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${day.date}-${dayIndex}`}
                        className="w-3 h-3 rounded-sm border border-gray-200"
                        style={{
                          backgroundColor: day.isCurrentYear ? getColor(day.score) : '#f9fafb',
                          opacity: day.isCurrentYear ? 1 : 0.3
                        }}
                        title={day.isCurrentYear ? 
                          `${day.date}: ${day.score !== undefined ? 
                            (day.score > 0 ? 'Positive' : day.score < 0 ? 'Negative' : 'Neutral') : 
                            'No data'}` : 
                          ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }))}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-black">Less</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#ebedf0' }}></div>
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#ef4444' }}></div>
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#10b981' }}></div>
          </div>
          <span className="text-black">More</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-black">Negative</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#ebedf0' }}></div>
            <span className="text-black">Neutral</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-black">Positive</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeatmap;