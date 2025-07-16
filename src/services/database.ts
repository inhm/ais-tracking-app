import { Pool, PoolClient } from 'pg';
import { AISMessage, AISPosition, AISStaticData, Ship } from '../types/ais.types';
import { AISParser } from './ais-parser';
import { Logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;
  private logger: Logger;

  constructor(connectionString: string) {
    this.logger = Logger.getLogger('DATABASE');
    this.logger.info('Initializing DatabaseService', { connectionString: connectionString?.replace(/\/\/.*:.*@/, '//***:***@') });
    
    this.pool = new Pool({
      connectionString,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
      acquireTimeoutMillis: 60000,
      allowExitOnIdle: true,
    });
    
    this.pool.on('error', (err) => {
      this.logger.error('Database pool error', err);
    });

    this.pool.on('connect', (client) => {
      this.logger.debug('New database client connected');
    });

    this.pool.on('acquire', (client) => {
      this.logger.debug('Database client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      this.logger.debug('Database client removed from pool');
    });
  }

  async connect(): Promise<void> {
    this.logger.logMethodEntry('connect');
    try {
      const client = await this.pool.connect();
      this.logger.info('Successfully connected to PostgreSQL database');
      
      // Test the connection and log database info
      const result = await client.query('SELECT current_database(), version()');
      this.logger.info('Database connection verified', {
        database: result.rows[0].current_database,
        version: result.rows[0].version
      });
      
      client.release();
      this.logger.logMethodExit('connect', { success: true });
    } catch (error) {
      this.logger.error('Database connection error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.logMethodEntry('disconnect');
    await this.pool.end();
    this.logger.info('Database connection pool ended');
    this.logger.logMethodExit('disconnect');
  }

  async saveAISMessage(message: AISMessage): Promise<void> {
    this.logger.logMethodEntry('saveAISMessage', { mmsi: message.mmsi, messageType: message.messageType });
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let client: PoolClient | null = null;
      
      try {
        this.logger.debug(`Attempting to save AIS message (attempt ${attempt}/${maxRetries})`);
        client = await this.pool.connect();
        this.logger.debug('Database client acquired for saveAISMessage');
        
        await client.query('BEGIN');
        this.logger.debug('Database transaction started');

        this.logger.logDatabaseOperation('INSERT ais_messages', 
          'INSERT INTO ais_messages (mmsi, message_type, raw_message, parsed_data, timestamp_received) VALUES ($1, $2, $3, $4, $5)',
          [message.mmsi, message.messageType, message.raw?.substring(0, 100), 'JSON', message.timestamp]
        );

        await client.query(
          'INSERT INTO ais_messages (mmsi, message_type, raw_message, parsed_data, timestamp_received) VALUES ($1, $2, $3, $4, $5)',
          [message.mmsi, message.messageType, message.raw, JSON.stringify(message), message.timestamp]
        );

        if (message.messageType >= 1 && message.messageType <= 3) {
          this.logger.debug('Saving position message');
          await this.savePositionMessage(client, message as AISPosition);
        }

        if (message.messageType === 5) {
          this.logger.debug('Saving static data message');
          await this.saveStaticDataMessage(client, message as AISStaticData);
        }

        await client.query('COMMIT');
        this.logger.debug('Database transaction committed successfully');
        this.logger.logMethodExit('saveAISMessage', { success: true, attempt });
        return; // Success - exit retry loop
        
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Database operation failed (attempt ${attempt}/${maxRetries})`, error);
        
        if (client) {
          try {
            await client.query('ROLLBACK');
            this.logger.debug('Database transaction rolled back');
          } catch (rollbackError) {
            this.logger.error('Error during rollback', rollbackError);
          }
        }
        
        if (attempt === maxRetries) {
          this.logger.error(`Error saving AIS message after ${maxRetries} attempts`, error);
        } else {
          this.logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${attempt * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      } finally {
        if (client) {
          client.release();
          this.logger.debug('Database client released');
        }
      }
    }
    
    throw lastError;
  }

  private async savePositionMessage(client: PoolClient, position: AISPosition): Promise<void> {
    // Ensure ship record exists before inserting position
    await client.query(
      `INSERT INTO ships (mmsi) 
       VALUES ($1) 
       ON CONFLICT (mmsi) DO NOTHING`,
      [position.mmsi]
    );

    await client.query(
      `INSERT INTO ais_positions 
       (mmsi, message_type, latitude, longitude, speed_over_ground, course_over_ground, 
        true_heading, navigation_status, timestamp_received, timestamp_utc, raw_message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        position.mmsi,
        position.messageType,
        position.latitude,
        position.longitude,
        position.speedOverGround,
        position.courseOverGround,
        position.trueHeading,
        position.navigationStatus,
        position.timestamp,
        position.timestampUTC,
        position.raw
      ]
    );
  }

  private async saveStaticDataMessage(client: PoolClient, staticData: AISStaticData): Promise<void> {
    const vesselTypeName = staticData.vesselType ? AISParser.getVesselTypeName(staticData.vesselType) : null;
    
    await client.query(
      `INSERT INTO ships (mmsi, imo_number, call_sign, vessel_name, vessel_type, vessel_type_name, 
       dimensions_length, dimensions_width, dimensions_draught, destination, eta) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (mmsi) DO UPDATE SET
       imo_number = EXCLUDED.imo_number,
       call_sign = EXCLUDED.call_sign,
       vessel_name = EXCLUDED.vessel_name,
       vessel_type = EXCLUDED.vessel_type,
       vessel_type_name = EXCLUDED.vessel_type_name,
       dimensions_length = EXCLUDED.dimensions_length,
       dimensions_width = EXCLUDED.dimensions_width,
       dimensions_draught = EXCLUDED.dimensions_draught,
       destination = EXCLUDED.destination,
       eta = EXCLUDED.eta,
       updated_at = CURRENT_TIMESTAMP`,
      [
        staticData.mmsi,
        staticData.imoNumber,
        staticData.callSign,
        staticData.vesselName,
        staticData.vesselType,
        vesselTypeName,
        staticData.dimensions?.length,
        staticData.dimensions?.width,
        staticData.dimensions?.draught,
        staticData.destination,
        staticData.eta
      ]
    );
  }

  async getShips(limit: number = 100): Promise<Ship[]> {
    const result = await this.pool.query(
      'SELECT * FROM ships ORDER BY updated_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  async getRecentPositions(minutes: number = 60, limit: number = 1000): Promise<AISPosition[]> {
    const result = await this.pool.query(
      `SELECT p.*, s.vessel_name, s.vessel_type_name 
       FROM ais_positions p 
       LEFT JOIN ships s ON p.mmsi = s.mmsi 
       WHERE p.timestamp_received >= NOW() - INTERVAL '${minutes} minutes' 
       ORDER BY p.timestamp_received DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getHealthMetrics(timeRange: string = '1 hour'): Promise<any> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(DISTINCT mmsi) as unique_ships,
        COUNT(*) as total_messages,
        COUNT(CASE WHEN message_type IN (1,2,3) THEN 1 END) as position_updates,
        MAX(timestamp_received) as last_message_time
       FROM ais_messages 
       WHERE timestamp_received >= NOW() - INTERVAL '${timeRange}'`
    );
    return result.rows[0];
  }

  async recordHealthMetric(metricName: string, value: number): Promise<void> {
    await this.pool.query(
      'INSERT INTO system_health (metric_name, metric_value) VALUES ($1, $2)',
      [metricName, value]
    );
  }

  async getConnectionHealth(): Promise<{
    isConnected: boolean;
    database: string;
    host: string;
    port: number;
    poolSize: number;
    idleConnections: number;
    waitingClients: number;
    lastError?: string;
  }> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT current_database(), inet_server_addr(), inet_server_port()');
      client.release();
      
      const [row] = result.rows;
      
      return {
        isConnected: true,
        database: row.current_database || 'unknown',
        host: row.inet_server_addr || 'localhost',
        port: parseInt(row.inet_server_port) || 5432,
        poolSize: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        isConnected: false,
        database: 'unknown',
        host: 'unknown',
        port: 0,
        poolSize: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const latency = Date.now() - startTime;
      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { 
        success: false, 
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}