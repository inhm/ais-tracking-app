import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { MetricsDashboard } from './MetricsDashboard';
import { TimeRangeSelector } from './TimeRangeSelector';
import { AlertSystem } from './AlertSystem';
import { MetricsChart } from './MetricsChart';
import { HealthIndicators } from './HealthIndicators';
import { useWebSocket } from '../hooks/useWebSocket';
import { TimeRange } from '../types/dashboard.types';

export const Dashboard: React.FC = () => {
  const { isConnected, systemHealth } = useWebSocket();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    value: '1 hour',
    label: '1 hour',
    minutes: 60
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Debug logging
  console.log('Dashboard state:', { isConnected, systemHealth });

  const fetchMetrics = async (timeRange: string) => {
    console.log('Fetching metrics for timeRange:', timeRange);
    setIsLoadingMetrics(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      console.log('API URL:', API_URL);
      const response = await fetch(`${API_URL}/api/metrics?timeRange=${encodeURIComponent(timeRange)}`);
      
      console.log('Metrics response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Metrics data received:', data);
      } else {
        console.error('Metrics fetch failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics(selectedTimeRange.value);
  }, [selectedTimeRange]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AIS Tracking Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time monitoring of ship tracking data from Norwegian waters
          </p>
        </div>

        {/* Alerts */}
        <div className="mb-6">
          <AlertSystem
            isWebSocketConnected={isConnected}
            isAISConnected={systemHealth?.isAISConnected || false}
            lastMessageTime={systemHealth?.lastMessageTime ? new Date(systemHealth.lastMessageTime) : undefined}
          />
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <TimeRangeSelector
            selectedRange={selectedTimeRange}
            onRangeChange={handleTimeRangeChange}
            isLoading={isLoadingMetrics}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Metrics Dashboard - Takes up 2/3 of the width */}
          <div className="lg:col-span-2">
            <MetricsDashboard
              systemHealth={systemHealth}
              timeRange={selectedTimeRange.value}
            />
          </div>

          {/* Side Panel - Takes up 1/3 of the width */}
          <div className="lg:col-span-1 space-y-6">
            <ConnectionStatus
              isWebSocketConnected={isConnected}
              isAISConnected={systemHealth?.isAISConnected || false}
              lastMessageTime={systemHealth?.lastMessageTime ? new Date(systemHealth.lastMessageTime) : undefined}
            />
            
            <HealthIndicators
              database={systemHealth?.database}
              systemHealth={systemHealth}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6">
          <MetricsChart
            timeRange={selectedTimeRange.value}
            isConnected={isConnected}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            AIS data sourced from Barentswatch AIS API (api.barentswatch.no)
          </p>
          <p className="mt-1">
            Dashboard updates in real-time via WebSocket connection
          </p>
        </div>
      </div>
    </div>
  );
};