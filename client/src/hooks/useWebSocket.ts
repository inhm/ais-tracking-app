import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SystemHealth } from '../types/dashboard.types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    });

    newSocket.on('healthUpdate', (health: SystemHealth) => {
      console.log('Received health update:', health);
      setSystemHealth(health);
    });

    newSocket.on('aisMessage', (message: any) => {
      setLastMessage(message);
    });

    newSocket.on('aisStatus', (status: { connected: boolean }) => {
      setSystemHealth(prev => prev ? { ...prev, isAISConnected: status.connected } : null);
    });

    setSocket(newSocket);

    return newSocket;
  }, []);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  useEffect(() => {
    const newSocket = connect();

    return () => {
      newSocket.disconnect();
    };
  }, [connect]);

  return {
    socket,
    isConnected,
    systemHealth,
    lastMessage,
    connect,
    disconnect
  };
};