import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { AISServiceV2 } from './services/ais-service-v2';
import { DatabaseInitializer } from './services/database-init';
import { BarentswatchConfig } from './services/barentswatch-api';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ais_user:ais_password@localhost:5432/ais_tracking';

// Barentswatch API configuration
const barentswatwchConfig: BarentswatchConfig = {
  clientId: process.env.BARENTSWATCH_CLIENT_ID || '',
  clientSecret: process.env.BARENTSWATCH_CLIENT_SECRET || '',
  scope: process.env.BARENTSWATCH_SCOPE || 'ais',
  authUrl: process.env.BARENTSWATCH_AUTH_URL || 'https://id.barentswatch.no/connect/token',
  apiBaseUrl: process.env.BARENTSWATCH_API_URL || 'https://live.ais.barentswatch.no'
};

// Initialize AIS service with Barentswatch API
const aisService = new AISServiceV2(DATABASE_URL, barentswatwchConfig);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await aisService.getSystemHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.get('/api/ships', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const ships = await aisService.getRecentShips(limit);
    res.json(ships);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ships' });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const limit = parseInt(req.query.limit as string) || 1000;
    const positions = await aisService.getRecentPositions(limit);
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '1 hour';
    const metrics = await aisService.getHealthMetrics(timeRange);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const [dbHealth, dbTest, systemHealth] = await Promise.all([
      aisService.database.getConnectionHealth(),
      aisService.database.testConnection(),
      aisService.getSystemHealth()
    ]);

    const health = {
      timestamp: new Date().toISOString(),
      database: {
        ...dbHealth,
        latency: dbTest.latency,
        testSuccess: dbTest.success
      },
      aisService: {
        isConnected: systemHealth.isAISConnected,
        messageCount: systemHealth.messageCount,
        positionCount: systemHealth.positionCount,
        lastMessageTime: systemHealth.lastMessageTime
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch health status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve static files from React build
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// Catch-all handler for React Router (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial health status
  Promise.all([
    aisService.getSystemHealth(),
    aisService.database.getConnectionHealth()
  ]).then(([systemHealth, dbHealth]) => {
    socket.emit('healthUpdate', {
      ...systemHealth,
      database: dbHealth
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// AIS Service event handlers
aisService.on('messageReceived', (message) => {
  io.emit('aisMessage', message);
});

aisService.on('healthUpdate', async (health) => {
  const dbHealth = await aisService.database.getConnectionHealth();
  io.emit('healthUpdate', {
    ...health,
    database: dbHealth
  });
});

aisService.on('aisConnected', () => {
  console.log('AIS stream connected');
  io.emit('aisStatus', { connected: true });
});

aisService.on('aisDisconnected', () => {
  console.log('AIS stream disconnected');
  io.emit('aisStatus', { connected: false });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize database first
    console.log('Initializing database...');
    const pool = new Pool({ connectionString: DATABASE_URL });
    const dbInitializer = new DatabaseInitializer(pool);
    await dbInitializer.initializeDatabase();
    await pool.end(); // Close the initialization pool
    
    // Start AIS service
    console.log('Starting AIS service...');
    await aisService.start();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log('Shutting down server...');
  await aisService.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();