import { AISClient } from './ais-client';
import { DatabaseService } from './database';
import { AISMessage, SystemHealth } from '../types/ais.types';
import { EventEmitter } from 'events';

export class AISService extends EventEmitter {
  private aisClient: AISClient;
  private database: DatabaseService;
  private messageCount = 0;
  private positionCount = 0;
  private lastMessageTime?: Date;
  private healthInterval?: NodeJS.Timeout;

  constructor(
    databaseUrl: string,
    aisHost: string = '153.44.253.27',
    aisPort: number = 5631
  ) {
    super();
    this.aisClient = new AISClient(aisHost, aisPort);
    this.database = new DatabaseService(databaseUrl);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.aisClient.on('connected', () => {
      console.log('AIS client connected');
      this.emit('aisConnected');
    });

    this.aisClient.on('disconnected', () => {
      console.log('AIS client disconnected');
      this.emit('aisDisconnected');
    });

    this.aisClient.on('error', (error) => {
      console.error('AIS client error:', error);
      this.emit('aisError', error);
    });

    this.aisClient.on('message', async (message: AISMessage) => {
      try {
        await this.handleAISMessage(message);
      } catch (error) {
        console.error('Error handling AIS message:', error);
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.database.connect();
      this.aisClient.connect();
      this.startHealthMonitoring();
      console.log('AIS service started');
    } catch (error) {
      console.error('Failed to start AIS service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    this.aisClient.disconnect();
    await this.database.disconnect();
    console.log('AIS service stopped');
  }

  private async handleAISMessage(message: AISMessage): Promise<void> {
    this.messageCount++;
    this.lastMessageTime = new Date();

    if (message.messageType >= 1 && message.messageType <= 3) {
      this.positionCount++;
    }

    await this.database.saveAISMessage(message);
    this.emit('messageReceived', message);
  }

  private startHealthMonitoring(): void {
    this.healthInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        this.emit('healthUpdate', health);
      } catch (error) {
        console.error('Error updating health metrics:', error);
      }
    }, 60000); // Update every minute
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const metrics = await this.database.getHealthMetrics('1 hour');
    
    return {
      isAISConnected: this.aisClient.isConnectedToStream(),
      messageCount: this.messageCount,
      shipCount: parseInt(metrics.unique_ships) || 0,
      positionUpdates: parseInt(metrics.position_updates) || 0,
      lastMessageTime: this.lastMessageTime
    };
  }

  async getRecentShips(limit: number = 100) {
    return await this.database.getShips(limit);
  }

  async getRecentPositions(minutes: number = 60, limit: number = 1000) {
    return await this.database.getRecentPositions(minutes, limit);
  }

  async getHealthMetrics(timeRange: string = '1 hour') {
    return await this.database.getHealthMetrics(timeRange);
  }
}