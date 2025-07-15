import { AISService } from '../services/ais-service';
import { AISMessage, SystemHealth } from '../types/ais.types';

// Mock dependencies
jest.mock('../services/ais-client');
jest.mock('../services/database');

describe('AISService', () => {
  let aisService: AISService;
  let mockAISClient: any;
  let mockDatabase: any;

  beforeEach(() => {
    const { AISClient } = require('../services/ais-client');
    const { DatabaseService } = require('../services/database');

    mockAISClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnectedToStream: jest.fn().mockReturnValue(true),
      on: jest.fn(),
      emit: jest.fn(),
    };

    mockDatabase = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      saveAISMessage: jest.fn(),
      getShips: jest.fn(),
      getRecentPositions: jest.fn(),
      getHealthMetrics: jest.fn(),
      recordHealthMetric: jest.fn(),
    };

    AISClient.mockImplementation(() => mockAISClient);
    DatabaseService.mockImplementation(() => mockDatabase);

    aisService = new AISService('test-db-url', 'test-host', 1234);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should start the AIS service successfully', async () => {
      mockDatabase.connect.mockResolvedValue(undefined);
      
      await aisService.start();
      
      expect(mockDatabase.connect).toHaveBeenCalled();
      expect(mockAISClient.connect).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      const error = new Error('Database connection failed');
      mockDatabase.connect.mockRejectedValue(error);
      
      await expect(aisService.start()).rejects.toThrow('Database connection failed');
    });
  });

  describe('stop', () => {
    it('should stop the AIS service', async () => {
      await aisService.stop();
      
      expect(mockAISClient.disconnect).toHaveBeenCalled();
      expect(mockDatabase.disconnect).toHaveBeenCalled();
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health information', async () => {
      const mockMetrics = {
        unique_ships: '15',
        position_updates: '800'
      };
      
      mockDatabase.getHealthMetrics.mockResolvedValue(mockMetrics);
      mockAISClient.isConnectedToStream.mockReturnValue(true);
      
      const health = await aisService.getSystemHealth();
      
      expect(health).toEqual({
        isAISConnected: true,
        messageCount: 0,
        shipCount: 15,
        positionUpdates: 800,
        lastMessageTime: undefined
      });
    });

    it('should handle missing metrics gracefully', async () => {
      const mockMetrics = {
        unique_ships: null,
        position_updates: null
      };
      
      mockDatabase.getHealthMetrics.mockResolvedValue(mockMetrics);
      mockAISClient.isConnectedToStream.mockReturnValue(false);
      
      const health = await aisService.getSystemHealth();
      
      expect(health).toEqual({
        isAISConnected: false,
        messageCount: 0,
        shipCount: 0,
        positionUpdates: 0,
        lastMessageTime: undefined
      });
    });
  });

  describe('getRecentShips', () => {
    it('should fetch recent ships', async () => {
      const mockShips = [
        { mmsi: 123456789, vessel_name: 'Test Ship' }
      ];
      
      mockDatabase.getShips.mockResolvedValue(mockShips);
      
      const result = await aisService.getRecentShips(50);
      
      expect(mockDatabase.getShips).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockShips);
    });

    it('should use default limit when not specified', async () => {
      const mockShips = [];
      
      mockDatabase.getShips.mockResolvedValue(mockShips);
      
      await aisService.getRecentShips();
      
      expect(mockDatabase.getShips).toHaveBeenCalledWith(100);
    });
  });

  describe('getRecentPositions', () => {
    it('should fetch recent positions', async () => {
      const mockPositions = [
        { mmsi: 123456789, latitude: 59.123, longitude: 10.654 }
      ];
      
      mockDatabase.getRecentPositions.mockResolvedValue(mockPositions);
      
      const result = await aisService.getRecentPositions(30, 500);
      
      expect(mockDatabase.getRecentPositions).toHaveBeenCalledWith(30, 500);
      expect(result).toEqual(mockPositions);
    });

    it('should use default parameters when not specified', async () => {
      const mockPositions = [];
      
      mockDatabase.getRecentPositions.mockResolvedValue(mockPositions);
      
      await aisService.getRecentPositions();
      
      expect(mockDatabase.getRecentPositions).toHaveBeenCalledWith(60, 1000);
    });
  });

  describe('getHealthMetrics', () => {
    it('should fetch health metrics', async () => {
      const mockMetrics = {
        unique_ships: '20',
        total_messages: '1500',
        position_updates: '1200'
      };
      
      mockDatabase.getHealthMetrics.mockResolvedValue(mockMetrics);
      
      const result = await aisService.getHealthMetrics('24 hours');
      
      expect(mockDatabase.getHealthMetrics).toHaveBeenCalledWith('24 hours');
      expect(result).toEqual(mockMetrics);
    });

    it('should use default time range when not specified', async () => {
      const mockMetrics = {};
      
      mockDatabase.getHealthMetrics.mockResolvedValue(mockMetrics);
      
      await aisService.getHealthMetrics();
      
      expect(mockDatabase.getHealthMetrics).toHaveBeenCalledWith('1 hour');
    });
  });

  describe('message handling', () => {
    it('should handle AIS messages and update counters', async () => {
      const mockMessage: AISMessage = {
        messageType: 1,
        mmsi: 123456789,
        timestamp: new Date(),
        raw: '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F'
      };

      mockDatabase.saveAISMessage.mockResolvedValue(undefined);
      
      // Simulate the message handler being called
      const messageHandler = mockAISClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        await messageHandler(mockMessage);
      }
      
      expect(mockDatabase.saveAISMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle position messages and increment position counter', async () => {
      const mockPositionMessage: AISMessage = {
        messageType: 1, // Position message
        mmsi: 123456789,
        timestamp: new Date(),
        raw: '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F'
      };

      mockDatabase.saveAISMessage.mockResolvedValue(undefined);
      
      const messageHandler = mockAISClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        await messageHandler(mockPositionMessage);
      }
      
      expect(mockDatabase.saveAISMessage).toHaveBeenCalledWith(mockPositionMessage);
    });

    it('should handle database errors gracefully', async () => {
      const mockMessage: AISMessage = {
        messageType: 1,
        mmsi: 123456789,
        timestamp: new Date(),
        raw: '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F'
      };

      const error = new Error('Database error');
      mockDatabase.saveAISMessage.mockRejectedValue(error);
      
      const messageHandler = mockAISClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        // Should not throw, should handle error gracefully
        await expect(messageHandler(mockMessage)).resolves.toBeUndefined();
      }
    });
  });

  describe('event handling', () => {
    it('should set up event handlers for AIS client', () => {
      expect(mockAISClient.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockAISClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockAISClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAISClient.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should emit events when AIS client connects', () => {
      const connectHandler = mockAISClient.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      
      const emitSpy = jest.spyOn(aisService, 'emit');
      
      if (connectHandler) {
        connectHandler();
      }
      
      expect(emitSpy).toHaveBeenCalledWith('aisConnected');
    });

    it('should emit events when AIS client disconnects', () => {
      const disconnectHandler = mockAISClient.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];
      
      const emitSpy = jest.spyOn(aisService, 'emit');
      
      if (disconnectHandler) {
        disconnectHandler();
      }
      
      expect(emitSpy).toHaveBeenCalledWith('aisDisconnected');
    });
  });
});