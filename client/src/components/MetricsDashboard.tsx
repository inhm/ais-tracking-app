import React from 'react';
import { Ship, Activity, MessageSquare, Clock } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { SystemHealth } from '../types/dashboard.types';

interface MetricsDashboardProps {
  systemHealth: SystemHealth | null;
  timeRange: string;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  systemHealth,
  timeRange
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '5 minutes':
        return 'last 5 minutes';
      case '1 hour':
        return 'last hour';
      case '24 hours':
        return 'last 24 hours';
      default:
        return 'current session';
    }
  };

  if (!systemHealth) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Ships Tracked"
        value={formatNumber(systemHealth.shipCount)}
        icon={Ship}
        color="blue"
        subtitle={`Unique vessels in ${getTimeRangeLabel(timeRange)}`}
      />
      
      <MetricCard
        title="Position Updates"
        value={formatNumber(systemHealth.positionUpdates)}
        icon={Activity}
        color="green"
        subtitle={`Location reports in ${getTimeRangeLabel(timeRange)}`}
      />
      
      <MetricCard
        title="Total Messages"
        value={formatNumber(systemHealth.messageCount)}
        icon={MessageSquare}
        color="purple"
        subtitle={`All AIS messages in ${getTimeRangeLabel(timeRange)}`}
      />
      
      <MetricCard
        title="Last Update"
        value={systemHealth.lastMessageTime ? 
          new Date(systemHealth.lastMessageTime).toLocaleTimeString() : 
          'No data'
        }
        icon={Clock}
        color="orange"
        subtitle="Most recent message received"
      />
    </div>
  );
};