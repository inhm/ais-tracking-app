#!/bin/bash
# Initialize Render PostgreSQL Database
# Usage: ./scripts/init-render-db.sh "your-render-database-connection-string"

echo "🔧 Initializing AIS Tracking Database on Render"
echo "=============================================="

if [ -z "$1" ]; then
    echo "❌ Error: Database connection string required"
    echo "Usage: $0 \"postgresql://user:pass@host:port/db\""
    echo ""
    echo "To get your connection string:"
    echo "1. Go to your Render database dashboard"
    echo "2. Click 'Connect' → 'External Connection'"
    echo "3. Copy the connection string"
    exit 1
fi

CONNECTION_STRING="$1"

echo "📊 Testing database connection..."
if ! psql "$CONNECTION_STRING" -c "SELECT version();" > /dev/null 2>&1; then
    echo "❌ Failed to connect to database"
    echo "Please check your connection string and try again"
    exit 1
fi

echo "✅ Database connection successful!"

echo "🏗️  Creating database schema..."
if psql "$CONNECTION_STRING" -f database/init.sql; then
    echo "✅ Database schema created successfully!"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

echo "🔍 Verifying tables were created..."
TABLES=$(psql "$CONNECTION_STRING" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ' | grep -v '^$')

echo "Created tables:"
echo "$TABLES" | while read table; do
    echo "  ✓ $table"
done

echo ""
echo "🎉 Database initialization complete!"
echo "Your AIS tracking database is ready for deployment."
echo ""
echo "Next steps:"
echo "1. Create your web service on Render"
echo "2. Set the DATABASE_URL environment variable"
echo "3. Deploy your application"