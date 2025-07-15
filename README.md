# AIS Tracking Application

A real-time AIS (Automatic Identification System) ship tracking application built with Node.js, React, and PostgreSQL.

## Features

### Phase 1 (Completed)
- ✅ Integration with Norway AIS stream (153.44.253.27:5631)
- ✅ Real-time AIS message parsing and storage
- ✅ Ship information database
- ✅ Comprehensive test coverage
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Docker containerization
- ✅ Render deployment configuration

### Phase 2 (Planned)
- 🔄 Management dashboard with health monitoring
- 🔄 Real-time metrics (ships reported, position updates)
- 🔄 Connection status monitoring

### Phase 3 (Planned)
- 🔄 Interactive map with ship positions
- 🔄 Time-based position filtering
- 🔄 Ship characteristic filtering

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **Real-time**: WebSockets (Socket.IO)
- **Testing**: Jest, React Testing Library
- **Deployment**: Docker, Render
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AISprototyp
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Or run locally**
   ```bash
   # Install dependencies
   npm install
   cd client && npm install && cd ..
   
   # Start PostgreSQL (if not using Docker)
   # Configure DATABASE_URL in .env
   
   # Run development server
   npm run dev
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- ais-parser.test.ts

# Run frontend tests
cd client && npm test
```

### Building for Production

```bash
# Build backend
npm run server:build

# Build frontend
npm run client:build

# Build both
npm run build
```

## API Endpoints

### Health Check
- `GET /health` - Application health status

### Ships
- `GET /api/ships?limit=100` - Get recent ships
- `GET /api/positions?minutes=60&limit=1000` - Get recent positions
- `GET /api/metrics?timeRange=1 hour` - Get system metrics

### WebSocket Events
- `aisMessage` - New AIS message received
- `healthUpdate` - System health update
- `aisStatus` - AIS connection status

## Database Schema

### Ships Table
- `mmsi` (Primary Key)
- `imo_number`, `call_sign`, `vessel_name`
- `vessel_type`, `vessel_type_name`
- `dimensions_length`, `dimensions_width`, `dimensions_draught`
- `destination`, `eta`
- `created_at`, `updated_at`

### AIS Positions Table
- `id` (Primary Key)
- `mmsi` (Foreign Key)
- `latitude`, `longitude`
- `speed_over_ground`, `course_over_ground`
- `true_heading`, `navigation_status`
- `timestamp_received`, `timestamp_utc`
- `raw_message`

### AIS Messages Table
- `id` (Primary Key)
- `mmsi`, `message_type`
- `raw_message`, `parsed_data`
- `timestamp_received`, `processed`

## Deployment

### Render (Recommended)
1. Fork this repository
2. Connect to Render
3. Create a new PostgreSQL database
4. Create a new web service using this repository
5. Deploy automatically on every push to main

### Docker
```bash
# Build image
docker build -t ais-tracking .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e AIS_HOST=153.44.253.27 \
  -e AIS_PORT=5631 \
  ais-tracking
```

## Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `AIS_HOST` - AIS stream hostname
- `AIS_PORT` - AIS stream port
- `CLIENT_URL` - Frontend URL for CORS

### AIS Stream Configuration
The application connects to the Norwegian AIS stream at:
- Host: 153.44.253.27
- Port: 5631
- Protocol: TCP
- Format: NMEA 0183

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the GitHub repository.