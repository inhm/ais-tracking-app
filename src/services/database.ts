import { Pool, PoolClient } from 'pg';
import { AISMessage, AISPosition, AISStaticData, Ship } from '../types/ais.types';
import { AISParser } from './ais-parser';

export class DatabaseService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.pool.connect();
      console.log('Connected to PostgreSQL database');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async saveAISMessage(message: AISMessage): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO ais_messages (mmsi, message_type, raw_message, parsed_data, timestamp_received) VALUES ($1, $2, $3, $4, $5)',
        [message.mmsi, message.messageType, message.raw, JSON.stringify(message), message.timestamp]
      );

      if (message.messageType >= 1 && message.messageType <= 3) {
        await this.savePositionMessage(client, message as AISPosition);
      }

      if (message.messageType === 5) {
        await this.saveStaticDataMessage(client, message as AISStaticData);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving AIS message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async savePositionMessage(client: PoolClient, position: AISPosition): Promise<void> {
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
}