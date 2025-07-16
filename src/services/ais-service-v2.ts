import { BarentswatchAPIClient, BarentswatchConfig, BarentswatchAISData } from './barentswatch-api';
import { DatabaseService } from './database';
import { AISMessage, SystemHealth } from '../types/ais.types';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export class AISServiceV2 extends EventEmitter {
  private apiClient: BarentswatchAPIClient;
  public database: DatabaseService;
  private messageCount = 0;
  private positionCount = 0;
  private lastMessageTime?: Date;
  private healthInterval?: NodeJS.Timeout;
  private logger: Logger;

  constructor(
    databaseUrl: string,
    barentswatwchConfig: BarentswatchConfig
  ) {
    super();
    this.logger = Logger.getLogger('AIS-SERVICE-V2');
    this.logger.info('Initializing AIS Service V2', { 
      databaseUrl: databaseUrl.replace(/\/\/.*:.*@/, '//***:***@'),
      apiBaseUrl: barentswatwchConfig.apiBaseUrl
    });
    
    this.apiClient = new BarentswatchAPIClient(barentswatwchConfig);
    this.database = new DatabaseService(databaseUrl);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.apiClient.on('connected', () => {
      console.log('Barentswatch API client connected');
      this.emit('aisConnected');
    });

    this.apiClient.on('disconnected', () => {
      console.log('Barentswatch API client disconnected');
      this.emit('aisDisconnected');
    });

    this.apiClient.on('error', (error: Error) => {
      console.error('Barentswatch API error:', error);
      this.emit('error', error);
    });

    this.apiClient.on('aisMessage', (vesselData: BarentswatchAISData) => {
      this.handleAISMessage(vesselData);
    });

    this.apiClient.on('dataUpdate', (update: { timestamp: string; vesselCount: number }) => {
      console.log(`📊 Data update: ${update.vesselCount} vessels at ${update.timestamp}`);
    });
  }

  private async handleAISMessage(vesselData: BarentswatchAISData): Promise<void> {
    try {
      this.messageCount++;
      this.lastMessageTime = new Date();

      // Convert Barentswatch data to our internal AIS message format
      const aisMessage: AISMessage = {
        mmsi: vesselData.mmsi,
        messageType: vesselData.messageType,
        timestamp: new Date(vesselData.timestamp),
        raw: JSON.stringify(vesselData) // Store original API data
      };

      // Store in database
      await this.database.saveAISMessage(aisMessage);

      // Update position count for position reports
      if (vesselData.messageType <= 3) {
        this.positionCount++;
      }

      // Emit the message for real-time updates
      this.emit('messageReceived', aisMessage);

    } catch (error) {
      console.error('Error handling AIS message:', error);
    }
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting AIS Service V2 with Barentswatch API...');
      
      // Initialize database connection
      await this.database.connect();
      console.log('✅ Database connected');

      // Start API client with 30-second polling interval
      this.apiClient.start(30000);
      console.log('✅ API client started');

      // Start health monitoring
      this.startHealthMonitoring();
      console.log('✅ Health monitoring started');

      console.log('🎉 AIS Service V2 started successfully');
    } catch (error) {
      console.error('❌ Failed to start AIS Service V2:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping AIS Service V2...');

    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = undefined;
    }

    this.apiClient.stop();
    await this.database.disconnect();

    console.log('✅ AIS Service V2 stopped');
  }

  private startHealthMonitoring(): void {
    // Update health metrics every 30 seconds
    this.healthInterval = setInterval(async () => {
      try {
        await this.updateHealthMetrics();
        const health = await this.getSystemHealth();
        this.emit('healthUpdate', health);
      } catch (error) {
        console.error('Error updating health metrics:', error);
      }
    }, 30000);
  }

  private async updateHealthMetrics(): Promise<void> {
    try {
      // Health metrics are now calculated on-the-fly from database queries
      console.log(`📊 Health update: ${this.messageCount} messages, ${this.positionCount} positions`);
    } catch (error) {
      console.error('Error updating health metrics:', error);
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const connectionInfo = this.apiClient.getConnectionInfo();
      const dbHealth = await this.database.getHealthMetrics('1 hour');

      return {
        isAISConnected: connectionInfo.connected,
        messageCount: this.messageCount,
        shipCount: parseInt(dbHealth.unique_ships) || 0,
        positionUpdates: parseInt(dbHealth.position_updates) || 0,
        lastMessageTime: this.lastMessageTime
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        isAISConnected: false,
        messageCount: this.messageCount,
        shipCount: 0,
        positionUpdates: this.positionCount,
        lastMessageTime: this.lastMessageTime
      };
    }
  }

  async getRecentShips(limit: number = 100): Promise<any[]> {
    return this.database.getShips(limit);
  }

  async getRecentPositions(limit: number = 1000): Promise<any[]> {
    return this.database.getRecentPositions(60, limit); // Last 60 minutes
  }

  async getHealthMetrics(timeRange: string): Promise<any> {
    return this.database.getHealthMetrics(timeRange);
  }
}