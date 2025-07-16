import React from 'react';
import { Database, Server, Activity, Clock, Users, Zap } from 'lucide-react';

interface DatabaseHealth {
  isConnected: boolean;
  database: string;
  host: string;
  port: number;
  poolSize: number;
  idleConnections: number;
  waitingClients: number;
  lastError?: string;
}

interface HealthIndicatorsProps {
  database?: DatabaseHealth;
  systemHealth?: {
    isAISConnected: boolean;
    messageCount: number;
    positionCount: number;
    lastMessageTime?: string;
  };
}

export const HealthIndicators: React.FC<HealthIndicatorsProps> = ({
  database,
  systemHealth
}) => {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
        <Activity className="w-5 h-5 text-blue-500" />
        <span>System Health</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Health */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Database className={`w-4 h-4 ${database?.isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="font-medium">Database</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${database?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          
          {database && (
            <div className="text-sm text-gray-600 space-y-1">
              <div>DB: {database.database}</div>
              <div>Host: {database.host}:{database.port}</div>
              <div>Pool: {database.poolSize} ({database.idleConnections} idle)</div>
              {database.waitingClients > 0 && (
                <div className="text-orange-600">Waiting: {database.waitingClients}</div>
              )}
              {database.lastError && (
                <div className="text-red-600 text-xs">Error: {database.lastError}</div>
              )}
            </div>
          )}
        </div>

        {/* AIS Service Health */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Server className={`w-4 h-4 ${systemHealth?.isAISConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="font-medium">AIS Service</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${systemHealth?.isAISConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          
          {systemHealth && (
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>Messages: {systemHealth.messageCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Positions: {systemHealth.positionCount?.toLocaleString() || 0}</span>
              </div>
              {systemHealth.lastMessageTime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Last: {new Date(systemHealth.lastMessageTime).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => window.open('/api/health', '_blank')}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            View Full Health
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};