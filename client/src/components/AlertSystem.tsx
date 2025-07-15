import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { AlertType } from '../types/dashboard.types';

interface AlertSystemProps {
  isWebSocketConnected: boolean;
  isAISConnected: boolean;
  lastMessageTime?: Date;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  isWebSocketConnected,
  isAISConnected,
  lastMessageTime
}) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  useEffect(() => {
    const newAlerts: AlertType[] = [];
    const now = new Date();

    // Check WebSocket connection
    if (!isWebSocketConnected) {
      newAlerts.push({
        id: 'websocket-disconnected',
        type: 'error',
        message: 'Dashboard connection lost. Attempting to reconnect...',
        timestamp: now,
        dismissed: false
      });
    }

    // Check AIS connection
    if (!isAISConnected) {
      newAlerts.push({
        id: 'ais-disconnected',
        type: 'error',
        message: 'AIS stream disconnected. Data updates suspended.',
        timestamp: now,
        dismissed: false
      });
    }

    // Check for stale data
    if (lastMessageTime) {
      const timeDiff = now.getTime() - lastMessageTime.getTime();
      const minutesSinceLastMessage = Math.floor(timeDiff / 60000);

      if (minutesSinceLastMessage > 5) {
        newAlerts.push({
          id: 'stale-data',
          type: 'warning',
          message: `No new messages received for ${minutesSinceLastMessage} minutes`,
          timestamp: now,
          dismissed: false
        });
      }
    }

    // Add success alert when both connections are healthy
    if (isWebSocketConnected && isAISConnected && newAlerts.length === 0) {
      newAlerts.push({
        id: 'all-systems-healthy',
        type: 'info',
        message: 'All systems operational. Real-time data streaming.',
        timestamp: now,
        dismissed: false
      });
    }

    setAlerts(prevAlerts => {
      // Remove dismissed alerts and add new ones
      const activePrevAlerts = prevAlerts.filter(alert => alert.dismissed);
      const existingIds = activePrevAlerts.map(a => a.id);
      const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.includes(alert.id));
      
      return [...activePrevAlerts, ...uniqueNewAlerts];
    });
  }, [isWebSocketConnected, isAISConnected, lastMessageTime]);

  const dismissAlert = (id: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === id ? { ...alert, dismissed: true } : alert
      )
    );
  };

  const activeAlerts = alerts.filter(alert => !alert.dismissed);

  if (activeAlerts.length === 0) return null;

  const getIcon = (type: AlertType['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = (type: AlertType['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'info':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border flex items-start justify-between ${getStyles(alert.type)}`}
        >
          <div className="flex items-start space-x-3">
            {getIcon(alert.type)}
            <div>
              <p className="font-medium">{alert.message}</p>
              <p className="text-sm opacity-80 mt-1">
                {alert.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => dismissAlert(alert.id)}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};