import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { AISService } from './services/ais-service';
import { DatabaseInitializer } from './services/database-init';

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
const AIS_HOST = process.env.AIS_HOST || '153.44.253.27';
const AIS_PORT = parseInt(process.env.AIS_PORT || '5631');

// Initialize AIS service
const aisService = new AISService(DATABASE_URL, AIS_HOST, AIS_PORT);

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
    const positions = await aisService.getRecentPositions(minutes, limit);
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
  aisService.getSystemHealth().then(health => {
    socket.emit('healthUpdate', health);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// AIS Service event handlers
aisService.on('messageReceived', (message) => {
  io.emit('aisMessage', message);
});

aisService.on('healthUpdate', (health) => {
  io.emit('healthUpdate', health);
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