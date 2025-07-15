import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartDataPoint } from '../types/dashboard.types';

interface MetricsChartProps {
  timeRange: string;
  isConnected: boolean;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ timeRange, isConnected }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/metrics?timeRange=${encodeURIComponent(timeRange)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Generate mock time series data for demonstration
          const points: ChartDataPoint[] = [];
          const now = new Date();
          const minutes = timeRange === '5 minutes' ? 5 : timeRange === '1 hour' ? 60 : 1440;
          const intervalMinutes = minutes <= 60 ? 1 : minutes <= 1440 ? 10 : 60;
          
          for (let i = minutes; i >= 0; i -= intervalMinutes) {
            const time = new Date(now.getTime() - i * 60000);
            points.push({
              time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              messages: Math.floor(Math.random() * 100) + data.total_messages || 0,
              ships: Math.floor(Math.random() * 20) + data.unique_ships || 0,
              positions: Math.floor(Math.random() * 80) + data.position_updates || 0
            });
          }
          
          setChartData(points);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      fetchChartData();
    }
  }, [timeRange, isConnected]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Metrics Over Time</h3>
        <span className="text-sm text-gray-500">Last {timeRange}</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="messages" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Messages"
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="ships" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Ships"
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="positions" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="Positions"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};