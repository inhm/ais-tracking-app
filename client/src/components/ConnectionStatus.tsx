import React from 'react';
import { Wifi, WifiOff, Radio, RadioOff } from 'lucide-react';

interface ConnectionStatusProps {
  isWebSocketConnected: boolean;
  isAISConnected: boolean;
  lastMessageTime?: Date;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isWebSocketConnected,
  isAISConnected,
  lastMessageTime
}) => {
  const formatLastMessage = (timestamp?: Date) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
      
      <div className="space-y-4">
        {/* WebSocket Connection */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {isWebSocketConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="font-medium">WebSocket</p>
              <p className="text-sm text-gray-600">Dashboard connection</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              isWebSocketConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isWebSocketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* AIS Stream Connection */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {isAISConnected ? (
              <Radio className="w-5 h-5 text-green-500" />
            ) : (
              <RadioOff className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="font-medium">AIS Stream</p>
              <p className="text-sm text-gray-600">153.44.253.27:5631</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isAISConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              isAISConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isAISConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Last Message Info */}
        {lastMessageTime && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Last message: <span className="font-medium text-blue-600">
                {formatLastMessage(lastMessageTime)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};