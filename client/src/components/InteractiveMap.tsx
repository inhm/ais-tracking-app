import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, Ship, Navigation } from 'lucide-react';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface ShipPosition {
  id: string;
  mmsi: string;
  latitude: number;
  longitude: number;
  speed_over_ground: number;
  course_over_ground: number;
  true_heading: number;
  navigation_status: number;
  vessel_name?: string;
  vessel_type_name?: string;
  timestamp_received: string;
  raw_message: string;
}

interface FilterOptions {
  vesselType: string;
  speedRange: [number, number];
  timeRange: string;
  showStationary: boolean;
}

interface InteractiveMapProps {
  className?: string;
}

// Custom ship icon based on vessel type
const createShipIcon = (vesselType: string, heading: number, speed: number) => {
  const color = getVesselColor(vesselType);
  const size = speed > 0 ? 16 : 12;
  
  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${heading}deg);
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="fill: ${color}; stroke: ${color}; stroke-width: 1;">
          <path d="M12 2 L20 20 L12 17 L4 20 Z" />
        </svg>
      </div>
    `,
    className: 'ship-icon',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

const getVesselColor = (vesselType: string): string => {
  const type = vesselType?.toLowerCase() || '';
  if (type.includes('cargo')) return '#FF6B35';
  if (type.includes('tanker')) return '#FF0000';
  if (type.includes('passenger')) return '#4ECDC4';
  if (type.includes('fishing')) return '#45B7D1';
  if (type.includes('tug')) return '#96CEB4';
  return '#6C5CE7';
};

const getNavigationStatusText = (status: number): string => {
  const statuses = {
    0: 'Under way using engine',
    1: 'At anchor',
    2: 'Not under command',
    3: 'Restricted manoeuvrability',
    4: 'Constrained by her draught',
    5: 'Moored',
    6: 'Aground',
    7: 'Engaged in fishing',
    8: 'Under way sailing',
    15: 'Undefined'
  };
  return statuses[status as keyof typeof statuses] || `Status ${status}`;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ className = '' }) => {
  const [ships, setShips] = useState<ShipPosition[]>([]);
  const [filteredShips, setFilteredShips] = useState<ShipPosition[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    vesselType: 'all',
    speedRange: [0, 50],
    timeRange: '1 hour',
    showStationary: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);

  // Norwegian waters center coordinates
  const norwegianCenter: [number, number] = [65.0, 10.0];

  // Fetch ship positions
  const fetchShips = useCallback(async (timeRange: string = '1 hour') => {
    setLoading(true);
    setError('');
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/positions?minutes=${getMinutesFromTimeRange(timeRange)}&limit=2000`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched ships:', data.length);
      
      // Parse and filter valid positions
      const validShips = data
        .map((ship: any) => {
          try {
            const rawData = JSON.parse(ship.raw_message);
            return {
              ...ship,
              latitude: rawData.latitude,
              longitude: rawData.longitude,
              speed_over_ground: rawData.speedOverGround,
              course_over_ground: rawData.courseOverGround,
              true_heading: rawData.trueHeading,
              navigation_status: rawData.navigationStatus,
            };
          } catch (e) {
            console.warn('Failed to parse ship data:', e);
            return null;
          }
        })
        .filter((ship: any) => ship && ship.latitude && ship.longitude)
        .filter((ship: any) => {
          // Filter for Norwegian waters approximately
          return ship.latitude >= 57 && ship.latitude <= 81 && 
                 ship.longitude >= -5 && ship.longitude <= 35;
        });
      
      setShips(validShips);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching ships:', err);
      setError('Failed to load ship positions');
      setLoading(false);
    }
  }, []);

  const getMinutesFromTimeRange = (timeRange: string): number => {
    switch (timeRange) {
      case '5 minutes': return 5;
      case '30 minutes': return 30;
      case '1 hour': return 60;
      case '6 hours': return 360;
      case '24 hours': return 1440;
      default: return 60;
    }
  };

  // Apply filters to ships
  useEffect(() => {
    let filtered = ships;

    // Vessel type filter
    if (filters.vesselType !== 'all') {
      filtered = filtered.filter(ship => 
        ship.vessel_type_name?.toLowerCase().includes(filters.vesselType.toLowerCase())
      );
    }

    // Speed filter
    filtered = filtered.filter(ship => {
      const speed = ship.speed_over_ground || 0;
      return speed >= filters.speedRange[0] && speed <= filters.speedRange[1];
    });

    // Stationary filter
    if (!filters.showStationary) {
      filtered = filtered.filter(ship => (ship.speed_over_ground || 0) > 0.1);
    }

    setFilteredShips(filtered);
  }, [ships, filters]);

  // Initial load and real-time updates
  useEffect(() => {
    fetchShips(filters.timeRange);
    
    if (isRealTimeMode) {
      const interval = setInterval(() => {
        fetchShips(filters.timeRange);
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [filters.timeRange, isRealTimeMode, fetchShips]);

  const handleTimeRangeChange = (newTimeRange: string) => {
    setFilters(prev => ({ ...prev, timeRange: newTimeRange }));
  };

  const handleVesselTypeChange = (type: string) => {
    setFilters(prev => ({ ...prev, vesselType: type }));
  };

  const toggleRealTimeMode = () => {
    setIsRealTimeMode(!isRealTimeMode);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header with controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Ship Tracking Map</h2>
            <span className="text-sm text-gray-500">
              {filteredShips.length} of {ships.length} ships
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time toggle */}
            <button
              onClick={toggleRealTimeMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isRealTimeMode 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{isRealTimeMode ? 'Live' : 'Historical'}</span>
            </button>
            
            {/* Time range selector */}
            <select
              value={filters.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5 minutes">Last 5 minutes</option>
              <option value="30 minutes">Last 30 minutes</option>
              <option value="1 hour">Last hour</option>
              <option value="6 hours">Last 6 hours</option>
              <option value="24 hours">Last 24 hours</option>
            </select>
            
            {/* Vessel type filter */}
            <select
              value={filters.vesselType}
              onChange={(e) => handleVesselTypeChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Vessels</option>
              <option value="cargo">Cargo Ships</option>
              <option value="tanker">Tankers</option>
              <option value="passenger">Passenger Ships</option>
              <option value="fishing">Fishing Vessels</option>
              <option value="tug">Tugboats</option>
            </select>
            
            {/* Stationary ships toggle */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={filters.showStationary}
                onChange={(e) => setFilters(prev => ({ ...prev, showStationary: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show stationary</span>
            </label>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span>Loading ship positions...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
            <div className="text-red-600 text-center">
              <p className="font-medium">Error loading map data</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => fetchShips(filters.timeRange)}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        <MapContainer
          center={norwegianCenter}
          zoom={6}
          style={{ height: '600px', width: '100%' }}
          className="rounded-b-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {filteredShips.map((ship) => (
            <Marker
              key={ship.mmsi}
              position={[ship.latitude, ship.longitude]}
              icon={createShipIcon(
                ship.vessel_type_name || '',
                ship.true_heading || ship.course_over_ground || 0,
                ship.speed_over_ground || 0
              )}
            >
              <Popup>
                <div className="min-w-[250px] space-y-2">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Ship className="w-4 h-4 text-blue-500" />
                    <div>
                      <h3 className="font-medium">
                        {ship.vessel_name || `Ship ${ship.mmsi}`}
                      </h3>
                      <p className="text-sm text-gray-600">MMSI: {ship.mmsi}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Type:</span>
                      <p className="text-gray-600">{ship.vessel_type_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Speed:</span>
                      <p className="text-gray-600">{ship.speed_over_ground?.toFixed(1) || 0} knots</p>
                    </div>
                    <div>
                      <span className="font-medium">Course:</span>
                      <p className="text-gray-600">{ship.course_over_ground?.toFixed(1) || 0}°</p>
                    </div>
                    <div>
                      <span className="font-medium">Heading:</span>
                      <p className="text-gray-600">{ship.true_heading?.toFixed(1) || 'N/A'}°</p>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">Status:</span>
                    <p className="text-gray-600">{getNavigationStatusText(ship.navigation_status)}</p>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">Position:</span>
                    <p className="text-gray-600">
                      {ship.latitude.toFixed(4)}°N, {ship.longitude.toFixed(4)}°E
                    </p>
                  </div>
                  
                  <div className="text-sm pt-2 border-t">
                    <span className="font-medium">Last Update:</span>
                    <p className="text-gray-600">
                      {new Date(ship.timestamp_received).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Cargo</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Tanker</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
              <span>Passenger</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Fishing</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Tug</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};