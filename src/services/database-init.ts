import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseInitializer {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async checkTablesExist(): Promise<boolean> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('ships', 'ais_positions', 'ais_messages', 'system_health')
      `;
      
      const result = await this.pool.query(query);
      const expectedTables = ['ships', 'ais_positions', 'ais_messages', 'system_health'];
      const existingTables = result.rows.map(row => row.table_name);
      
      return expectedTables.every(table => existingTables.includes(table));
    } catch (error) {
      console.error('Error checking tables:', error);
      return false;
    }
  }

  async initializeDatabase(): Promise<void> {
    try {
      console.log('Checking if database tables exist...');
      
      const tablesExist = await this.checkTablesExist();
      
      if (!tablesExist) {
        console.log('Database tables not found. Initializing database schema...');
        
        // Read the SQL initialization file
        const sqlPath = path.join(__dirname, '../../database/init.sql');
        let initSQL: string;
        
        try {
          initSQL = fs.readFileSync(sqlPath, 'utf8');
        } catch (fileError) {
          console.error('Could not read init.sql file:', fileError);
          // Fallback: use inline SQL
          initSQL = this.getInlineInitSQL();
        }
        
        // Execute the SQL
        await this.pool.query(initSQL);
        console.log('✅ Database schema initialized successfully');
        
        // Verify tables were created
        const tablesNowExist = await this.checkTablesExist();
        if (tablesNowExist) {
          console.log('✅ All required tables verified');
        } else {
          throw new Error('Tables were not created properly');
        }
      } else {
        console.log('✅ Database tables already exist');
      }
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  private getInlineInitSQL(): string {
    return `
      -- AIS Tracking Database Schema
      
      -- Table for storing ship information
      CREATE TABLE IF NOT EXISTS ships (
          mmsi BIGINT PRIMARY KEY,
          imo_number BIGINT,
          call_sign VARCHAR(20),
          vessel_name VARCHAR(100),
          vessel_type INTEGER,
          vessel_type_name VARCHAR(50),
          dimensions_length INTEGER,
          dimensions_width INTEGER,
          dimensions_draught INTEGER,
          destination VARCHAR(100),
          eta TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Table for storing AIS position messages
      CREATE TABLE IF NOT EXISTS ais_positions (
          id BIGSERIAL PRIMARY KEY,
          mmsi BIGINT NOT NULL,
          message_type INTEGER NOT NULL,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          speed_over_ground DECIMAL(5, 2),
          course_over_ground DECIMAL(5, 2),
          true_heading INTEGER,
          navigation_status INTEGER,
          timestamp_received TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          timestamp_utc TIMESTAMP,
          raw_message TEXT,
          FOREIGN KEY (mmsi) REFERENCES ships(mmsi) ON DELETE CASCADE
      );
      
      -- Table for storing raw AIS messages
      CREATE TABLE IF NOT EXISTS ais_messages (
          id BIGSERIAL PRIMARY KEY,
          mmsi BIGINT,
          message_type INTEGER NOT NULL,
          raw_message TEXT NOT NULL,
          parsed_data JSONB,
          timestamp_received TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT FALSE
      );
      
      -- Table for storing system health metrics
      CREATE TABLE IF NOT EXISTS system_health (
          id BIGSERIAL PRIMARY KEY,
          metric_name VARCHAR(50) NOT NULL,
          metric_value DECIMAL(10, 2),
          timestamp_recorded TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_ships_mmsi ON ships(mmsi);
      CREATE INDEX IF NOT EXISTS idx_ais_positions_mmsi ON ais_positions(mmsi);
      CREATE INDEX IF NOT EXISTS idx_ais_positions_timestamp ON ais_positions(timestamp_received);
      CREATE INDEX IF NOT EXISTS idx_ais_messages_mmsi ON ais_messages(mmsi);
      CREATE INDEX IF NOT EXISTS idx_ais_messages_timestamp ON ais_messages(timestamp_received);
      CREATE INDEX IF NOT EXISTS idx_ais_messages_processed ON ais_messages(processed);
      CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp_recorded);
      
      -- Function to update the updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      -- Trigger to automatically update updated_at on ships table
      DROP TRIGGER IF EXISTS update_ships_updated_at ON ships;
      CREATE TRIGGER update_ships_updated_at 
          BEFORE UPDATE ON ships 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;
  }
}