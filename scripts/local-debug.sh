#!/bin/bash

# Local Debug Script for AIS Tracking Application
# This script helps debug common issues during local development

echo "🔍 AIS Tracking Local Debug Script"
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
    exit 1
fi

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if command -v psql &> /dev/null; then
    DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
        echo "💡 Try starting PostgreSQL with Docker:"
        echo "   docker run -d --name ais-postgres -e POSTGRES_DB=ais_tracking -e POSTGRES_USER=ais_user -e POSTGRES_PASSWORD=ais_password -p 5432:5432 postgres:15"
        exit 1
    fi
else
    echo "⚠️  psql not found, skipping database check"
fi

# Check if Node.js dependencies are installed
echo "🔍 Checking Node.js dependencies..."
if [ ! -d node_modules ]; then
    echo "❌ Server dependencies not installed. Installing..."
    npm install
fi

if [ ! -d client/node_modules ]; then
    echo "❌ Client dependencies not installed. Installing..."
    cd client && npm install && cd ..
fi

# Build the server
echo "🔍 Building server..."
npm run build

# Check if build was successful
if [ -d dist ]; then
    echo "✅ Server build successful"
else
    echo "❌ Server build failed"
    exit 1
fi

# Start the application with debug logging
echo "🚀 Starting application with DEBUG logging..."
echo "Backend will run on http://localhost:3001"
echo "Frontend will run on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Set debug environment
export LOG_LEVEL=DEBUG
export NODE_ENV=development

# Start the server in the background
npm start &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Check if server started successfully
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Server started successfully"
else
    echo "❌ Server failed to start"
    kill $SERVER_PID
    exit 1
fi

# Start the client
cd client
npm start &
CLIENT_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for user to stop
echo "Application is running. Press Ctrl+C to stop."
wait