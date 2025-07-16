import React from 'react';
import { InteractiveMap } from './InteractiveMap';
import { ArrowLeft, Map } from 'lucide-react';

interface MapPageProps {
  onBack?: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            )}
            <div className="flex items-center space-x-2">
              <Map className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Ship Tracking Map</h1>
            </div>
          </div>
          
          <p className="text-gray-600 max-w-3xl">
            Interactive map showing real-time ship positions in Norwegian waters. 
            Click on ship markers to view detailed information, use filters to find specific vessels, 
            and toggle between live and historical data.
          </p>
        </div>

        {/* Map Component */}
        <InteractiveMap className="w-full" />
        
        {/* Usage Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How to use the map:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Click on ship markers</strong> to view detailed vessel information</li>
            <li>• <strong>Use the time range selector</strong> to view positions from different time periods</li>
            <li>• <strong>Filter by vessel type</strong> to show only specific types of ships</li>
            <li>• <strong>Toggle "Show stationary"</strong> to hide/show anchored or moored vessels</li>
            <li>• <strong>Switch between Live and Historical</strong> modes for real-time or static data</li>
            <li>• <strong>Zoom and pan</strong> the map to explore different areas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};