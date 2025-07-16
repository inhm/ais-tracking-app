import { EventEmitter } from 'events';

export interface BarentswatchConfig {
  clientId: string;
  clientSecret: string;
  scope: string;
  authUrl: string;
  apiBaseUrl: string;
}

export interface BarentswatchAISData {
  mmsi: number;
  latitude: number;
  longitude: number;
  speedOverGround?: number;
  courseOverGround?: number;
  trueHeading?: number;
  navigationStatus?: number;
  messageType: number;
  timestamp: string;
  callSign?: string;
  vesselName?: string;
  vesselType?: number;
  dimensionA?: number;
  dimensionB?: number;
  dimensionC?: number;
  dimensionD?: number;
  destination?: string;
  eta?: string;
}

export class BarentswatchAPIClient extends EventEmitter {
  private config: BarentswatchConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: BarentswatchConfig) {
    super();
    this.config = config;
  }

  async authenticate(): Promise<string> {
    try {
      const response = await fetch(this.config.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          scope: this.config.scope,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token received from authentication');
      }

      this.accessToken = data.access_token;
      // Token typically expires in 3600 seconds, refresh before expiry
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000); // Refresh 5 mins early

      console.log('✅ Successfully authenticated with Barentswatch API');
      return this.accessToken!;
    } catch (error) {
      console.error('❌ Barentswatch authentication failed:', error);
      throw error;
    }
  }

  async ensureValidToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      console.log('🔄 Refreshing Barentswatch access token...');
      await this.authenticate();
    }
    return this.accessToken!;
  }

  async fetchAISData(): Promise<BarentswatchAISData[]> {
    try {
      const token = await this.ensureValidToken();
      
      // Use the latest combined endpoint for real-time data
      const url = `${this.config.apiBaseUrl}/v1/latest/combined`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔄 Token expired, re-authenticating...');
          this.accessToken = null;
          return this.fetchAISData(); // Retry with new token
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // Transform the API response to our internal format
      const aisData: BarentswatchAISData[] = data.map((vessel: any) => ({
        mmsi: vessel.mmsi,
        latitude: vessel.latitude,
        longitude: vessel.longitude,
        speedOverGround: vessel.speedOverGround,
        courseOverGround: vessel.courseOverGround,
        trueHeading: vessel.trueHeading,
        navigationStatus: vessel.navigationStatus,
        messageType: vessel.messageType || 1, // Default to position report
        timestamp: vessel.timestamp || new Date().toISOString(),
        callSign: vessel.callSign,
        vesselName: vessel.vesselName,
        vesselType: vessel.vesselType,
        dimensionA: vessel.dimensionA,
        dimensionB: vessel.dimensionB,
        dimensionC: vessel.dimensionC,
        dimensionD: vessel.dimensionD,
        destination: vessel.destination,
        eta: vessel.eta,
      }));

      console.log(`📡 Fetched ${aisData.length} AIS records from Barentswatch API`);
      return aisData;
    } catch (error) {
      console.error('❌ Error fetching AIS data:', error);
      this.emit('error', error);
      return [];
    }
  }

  start(intervalMs: number = 30000): void {
    if (this.isRunning) {
      console.log('⚠️ Barentswatch API client is already running');
      return;
    }

    console.log(`🚀 Starting Barentswatch API client with ${intervalMs}ms interval`);
    this.isRunning = true;
    this.emit('connected');

    // Initial fetch
    this.fetchAndEmitData();

    // Set up polling interval
    this.pollInterval = setInterval(() => {
      this.fetchAndEmitData();
    }, intervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Barentswatch API client');
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.emit('disconnected');
  }

  private async fetchAndEmitData(): Promise<void> {
    try {
      const aisData = await this.fetchAISData();
      
      if (aisData.length > 0) {
        // Emit each vessel as a separate message for compatibility with existing system
        aisData.forEach(vessel => {
          this.emit('aisMessage', vessel);
        });
        
        this.emit('dataUpdate', {
          timestamp: new Date().toISOString(),
          vesselCount: aisData.length,
        });
      }
    } catch (error) {
      console.error('❌ Error in fetch and emit cycle:', error);
      this.emit('error', error);
    }
  }

  isConnected(): boolean {
    return this.isRunning && this.accessToken !== null;
  }

  getConnectionInfo(): { connected: boolean; lastFetch?: Date; tokenExpiry?: Date } {
    return {
      connected: this.isConnected(),
      lastFetch: new Date(),
      tokenExpiry: this.tokenExpiry || undefined,
    };
  }
}