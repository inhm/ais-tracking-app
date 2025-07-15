import { DatabaseService } from '../services/database';
import { AISMessage, AISPosition, AISStaticData } from '../types/ais.types';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    end: jest.fn(),
    query: jest.fn(),
  }))
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn(),
      query: jest.fn(),
    };

    const { Pool } = require('pg');
    Pool.mockImplementation(() => mockPool);

    databaseService = new DatabaseService('test-connection-string');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to the database successfully', async () => {
      await databaseService.connect();
      
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);
      
      await expect(databaseService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should close the database connection', async () => {
      await databaseService.disconnect();
      
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('saveAISMessage', () => {
    const mockMessage: AISMessage = {
      messageType: 1,
      mmsi: 123456789,
      timestamp: new Date(),
      raw: '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F'
    };

    it('should save AIS message successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });
      
      await databaseService.saveAISMessage(mockMessage);
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO ais_messages (mmsi, message_type, raw_message, parsed_data, timestamp_received) VALUES ($1, $2, $3, $4, $5)',
        [mockMessage.mmsi, mockMessage.messageType, mockMessage.raw, JSON.stringify(mockMessage), mockMessage.timestamp]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should save position message for message types 1-3', async () => {
      const positionMessage: AISPosition = {
        ...mockMessage,
        messageType: 1,
        latitude: 59.123456,
        longitude: 10.654321,
        speedOverGround: 12.5,
        courseOverGround: 45.0,
        trueHeading: 46,
        navigationStatus: 0,
        timestampUTC: new Date()
      };

      mockClient.query.mockResolvedValue({ rows: [] });
      
      await databaseService.saveAISMessage(positionMessage);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ais_positions'),
        expect.arrayContaining([
          positionMessage.mmsi,
          positionMessage.messageType,
          positionMessage.latitude,
          positionMessage.longitude,
          positionMessage.speedOverGround,
          positionMessage.courseOverGround,
          positionMessage.trueHeading,
          positionMessage.navigationStatus,
          positionMessage.timestamp,
          positionMessage.timestampUTC,
          positionMessage.raw
        ])
      );
    });

    it('should save static data message for message type 5', async () => {
      const staticMessage: AISStaticData = {
        ...mockMessage,
        messageType: 5,
        imoNumber: 9876543,
        callSign: 'ABCD',
        vesselName: 'Test Vessel',
        vesselType: 70,
        dimensions: {
          length: 200,
          width: 30,
          draught: 8.5
        },
        destination: 'OSLO',
        eta: new Date()
      };

      mockClient.query.mockResolvedValue({ rows: [] });
      
      await databaseService.saveAISMessage(staticMessage);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ships'),
        expect.arrayContaining([
          staticMessage.mmsi,
          staticMessage.imoNumber,
          staticMessage.callSign,
          staticMessage.vesselName,
          staticMessage.vesselType,
          'Cargo',
          staticMessage.dimensions?.length,
          staticMessage.dimensions?.width,
          staticMessage.dimensions?.draught,
          staticMessage.destination,
          staticMessage.eta
        ])
      );
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);
      
      await expect(databaseService.saveAISMessage(mockMessage)).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getShips', () => {
    it('should fetch ships with default limit', async () => {
      const mockShips = [
        { mmsi: 123456789, vessel_name: 'Test Ship 1' },
        { mmsi: 987654321, vessel_name: 'Test Ship 2' }
      ];
      
      mockPool.query.mockResolvedValue({ rows: mockShips });
      
      const result = await databaseService.getShips();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM ships ORDER BY updated_at DESC LIMIT $1',
        [100]
      );
      expect(result).toEqual(mockShips);
    });

    it('should fetch ships with custom limit', async () => {
      const mockShips = [{ mmsi: 123456789, vessel_name: 'Test Ship' }];
      
      mockPool.query.mockResolvedValue({ rows: mockShips });
      
      const result = await databaseService.getShips(50);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM ships ORDER BY updated_at DESC LIMIT $1',
        [50]
      );
      expect(result).toEqual(mockShips);
    });
  });

  describe('getRecentPositions', () => {
    it('should fetch recent positions with default parameters', async () => {
      const mockPositions = [
        { mmsi: 123456789, latitude: 59.123, longitude: 10.654 }
      ];
      
      mockPool.query.mockResolvedValue({ rows: mockPositions });
      
      const result = await databaseService.getRecentPositions();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE p.timestamp_received >= NOW() - INTERVAL '60 minutes'"),
        [1000]
      );
      expect(result).toEqual(mockPositions);
    });

    it('should fetch recent positions with custom parameters', async () => {
      const mockPositions = [
        { mmsi: 123456789, latitude: 59.123, longitude: 10.654 }
      ];
      
      mockPool.query.mockResolvedValue({ rows: mockPositions });
      
      const result = await databaseService.getRecentPositions(30, 500);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE p.timestamp_received >= NOW() - INTERVAL '30 minutes'"),
        [500]
      );
      expect(result).toEqual(mockPositions);
    });
  });

  describe('getHealthMetrics', () => {
    it('should fetch health metrics with default time range', async () => {
      const mockMetrics = {
        unique_ships: '15',
        total_messages: '1000',
        position_updates: '800',
        last_message_time: new Date()
      };
      
      mockPool.query.mockResolvedValue({ rows: [mockMetrics] });
      
      const result = await databaseService.getHealthMetrics();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE timestamp_received >= NOW() - INTERVAL '1 hour'")
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should fetch health metrics with custom time range', async () => {
      const mockMetrics = {
        unique_ships: '25',
        total_messages: '2000',
        position_updates: '1500',
        last_message_time: new Date()
      };
      
      mockPool.query.mockResolvedValue({ rows: [mockMetrics] });
      
      const result = await databaseService.getHealthMetrics('24 hours');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE timestamp_received >= NOW() - INTERVAL '24 hours'")
      );
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('recordHealthMetric', () => {
    it('should record health metric', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      await databaseService.recordHealthMetric('message_count', 1000);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO system_health (metric_name, metric_value) VALUES ($1, $2)',
        ['message_count', 1000]
      );
    });
  });
});