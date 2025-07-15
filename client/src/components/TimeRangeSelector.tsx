import React from 'react';
import { Clock } from 'lucide-react';
import { TimeRange } from '../types/dashboard.types';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  isLoading?: boolean;
}

const TIME_RANGES: TimeRange[] = [
  { value: '5 minutes', label: '5 minutes', minutes: 5 },
  { value: '1 hour', label: '1 hour', minutes: 60 },
  { value: '24 hours', label: '24 hours', minutes: 1440 }
];

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  isLoading = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Time Range</span>
        </div>
        
        <div className="flex space-x-2">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => onRangeChange(range)}
              disabled={isLoading}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedRange.value === range.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      
      {isLoading && (
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Loading metrics...
        </div>
      )}
    </div>
  );
};