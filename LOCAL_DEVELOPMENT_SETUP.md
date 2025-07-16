# Local Development Setup Guide

This guide will help you set up the AIS Tracking application locally for debugging and development.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Step 1: Database Setup

### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL with Docker
docker run -d \
  --name ais-postgres \
  -e POSTGRES_DB=ais_tracking \
  -e POSTGRES_USER=ais_user \
  -e POSTGRES_PASSWORD=ais_password \
  -p 5432:5432 \
  postgres:15

# Wait for PostgreSQL to start
sleep 5

# Initialize the database
docker exec -i ais-postgres psql -U ais_user -d ais_tracking < database/init.sql
```

### Option B: Local PostgreSQL Installation
```bash
# Create database and user
sudo -u postgres psql -c "CREATE DATABASE ais_tracking;"
sudo -u postgres psql -c "CREATE USER ais_user WITH PASSWORD 'ais_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ais_tracking TO ais_user;"

# Initialize database schema
psql -U ais_user -d ais_tracking -f database/init.sql
```

## Step 2: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Set to `DEBUG` for detailed logging
- `BARENTSWATCH_CLIENT_ID`: Your Barentswatch API client ID
- `BARENTSWATCH_CLIENT_SECRET`: Your Barentswatch API client secret

## Step 3: Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

## Step 4: Build and Start the Application

```bash
# Build the server
npm run build

# Start the server (in one terminal)
npm start

# Start the client (in another terminal)
cd client
npm start
```

## Step 5: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## Debugging Features

### Server Logs
With `LOG_LEVEL=DEBUG`, you'll see detailed logs including:
- Database connection attempts and pool status
- API request/response details
- AIS message processing
- Error stack traces

### Client Debugging
Open browser developer tools to see:
- WebSocket connection status
- Dashboard state updates
- API fetch operations
- Component render logging

## Testing Database Connection

```bash
# Test database connection directly
psql -U ais_user -d ais_tracking -c "SELECT current_database(), version();"

# Check if tables exist
psql -U ais_user -d ais_tracking -c "\\dt"
```

## Common Issues and Solutions

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_ctl status`
- Check connection string format
- Verify user permissions

### API Connection Issues
- Check if Barentswatch API credentials are valid
- Verify network connectivity to api.barentswatch.no
- Check API rate limits

### Empty Dashboard
- Check WebSocket connection in browser dev tools
- Verify API endpoints are responding
- Check for CORS issues

## Debug Commands

```bash
# Check server logs with filtering
npm start 2>&1 | grep -E "(ERROR|WARN|DATABASE|AIS-SERVICE)"

# Test API endpoints
curl -X GET http://localhost:3001/api/health | jq .
curl -X GET http://localhost:3001/api/metrics | jq .

# Monitor database connections
psql -U ais_user -d ais_tracking -c "SELECT * FROM pg_stat_activity WHERE datname = 'ais_tracking';"
```

## Stopping the Application

```bash
# Stop the servers (Ctrl+C in each terminal)

# Stop Docker PostgreSQL (if used)
docker stop ais-postgres
docker rm ais-postgres
```