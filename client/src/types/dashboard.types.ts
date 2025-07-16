export interface SystemHealth {
  isAISConnected: boolean;
  messageCount: number;
  shipCount: number;
  positionUpdates: number;
  lastMessageTime?: Date;
  database?: {
    isConnected: boolean;
    database: string;
    host: string;
    port: number;
    poolSize: number;
    idleConnections: number;
    waitingClients: number;
    lastError?: string;
  };
}

export interface MetricData {
  uniqueShips: number;
  totalMessages: number;
  positionUpdates: number;
  lastMessageTime?: Date;
}

export interface TimeRange {
  value: string;
  label: string;
  minutes: number;
}

export interface AlertType {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  dismissed: boolean;
}

export interface ChartDataPoint {
  time: string;
  messages: number;
  ships: number;
  positions: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  uptime: number;
}