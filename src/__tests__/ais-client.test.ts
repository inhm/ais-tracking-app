import { AISClient } from '../services/ais-client';
import { EventEmitter } from 'events';

// Mock the net module
jest.mock('net', () => ({
  Socket: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
    setTimeout: jest.fn(),
  }))
}));

describe('AISClient', () => {
  let aisClient: AISClient;
  let mockSocket: any;

  beforeEach(() => {
    const { Socket } = require('net');
    mockSocket = {
      connect: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
      setTimeout: jest.fn(),
    };
    Socket.mockImplementation(() => mockSocket);
    
    aisClient = new AISClient('test-host', 1234);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (aisClient) {
      aisClient.disconnect();
    }
  });

  describe('connect', () => {
    it('should create a socket and attempt to connect', () => {
      aisClient.connect();
      
      expect(mockSocket.connect).toHaveBeenCalledWith(1234, 'test-host', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.setTimeout).toHaveBeenCalledWith(30000);
    });

    it('should not create multiple connections when already connected', () => {
      aisClient.connect();
      mockSocket.connect.mockClear();
      
      aisClient.connect();
      
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should emit connected event when socket connects', (done) => {
      aisClient.on('connected', () => {
        expect(aisClient.isConnectedToStream()).toBe(true);
        done();
      });

      aisClient.connect();
      
      // Simulate successful connection
      const connectCallback = mockSocket.connect.mock.calls[0][2];
      connectCallback();
    });
  });

  describe('disconnect', () => {
    it('should destroy the socket and emit disconnected event', (done) => {
      aisClient.on('disconnected', () => {
        expect(aisClient.isConnectedToStream()).toBe(false);
        done();
      });

      aisClient.connect();
      aisClient.disconnect();
      
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('data handling', () => {
    it('should process valid AIS messages', (done) => {
      const testMessage = '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F\n';
      
      aisClient.on('message', (message) => {
        expect(message).toBeDefined();
        expect(message.messageType).toBe(1);
        done();
      });

      aisClient.connect();
      
      // Simulate data reception
      const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'data')[1];
      dataHandler(Buffer.from(testMessage));
    });

    it('should handle multiple messages in single data chunk', (done) => {
      const testMessages = '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F\n!AIVDM,1,1,,A,15MvlfP001G?Uo`K>jK@K6<T0000,0*4F\n';
      let messageCount = 0;
      
      aisClient.on('message', (message) => {
        messageCount++;
        if (messageCount === 2) {
          done();
        }
      });

      aisClient.connect();
      
      const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'data')[1];
      dataHandler(Buffer.from(testMessages));
    });

    it('should handle partial messages across data chunks', (done) => {
      const part1 = '!AIVDM,1,1,,A,15MvlfP001G?Uo`K>';
      const part2 = 'jK@K6<T0000,0*4F\n';
      
      aisClient.on('message', (message) => {
        expect(message).toBeDefined();
        expect(message.messageType).toBe(1);
        done();
      });

      aisClient.connect();
      
      const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'data')[1];
      dataHandler(Buffer.from(part1));
      dataHandler(Buffer.from(part2));
    });
  });

  describe('error handling', () => {
    it('should emit error event on socket error', (done) => {
      const testError = new Error('Connection failed');
      
      aisClient.on('error', (error) => {
        expect(error).toBe(testError);
        done();
      });

      aisClient.connect();
      
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(testError);
    });

    it('should handle socket close event', (done) => {
      aisClient.on('disconnected', () => {
        expect(aisClient.isConnectedToStream()).toBe(false);
        done();
      });

      aisClient.connect();
      
      const closeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();
    });
  });

  describe('isConnectedToStream', () => {
    it('should return false initially', () => {
      expect(aisClient.isConnectedToStream()).toBe(false);
    });

    it('should return true after successful connection', () => {
      aisClient.connect();
      
      const connectCallback = mockSocket.connect.mock.calls[0][2];
      connectCallback();
      
      expect(aisClient.isConnectedToStream()).toBe(true);
    });

    it('should return false after disconnection', () => {
      aisClient.connect();
      
      const connectCallback = mockSocket.connect.mock.calls[0][2];
      connectCallback();
      
      aisClient.disconnect();
      
      expect(aisClient.isConnectedToStream()).toBe(false);
    });
  });
});