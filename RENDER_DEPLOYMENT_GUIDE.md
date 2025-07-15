# Render Deployment Guide - AIS Tracking Application

## Step-by-Step Deployment Process

### 1. Set Up Render Account
- Go to https://render.com
- Sign up using your GitHub account
- Allow Render to access your repositories

### 2. Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Configure:
   - Name: `ais-tracking-db`
   - Database: `ais_tracking`
   - User: `ais_user`
   - Region: Choose closest to you
   - Plan: Free (can upgrade later)
3. Click "Create Database"
4. Wait 2-3 minutes for creation

### 3. Initialize Database Schema
After database creation:
1. Go to your database dashboard
2. Click "Connect" → "External Connection"
3. Copy the connection string (starts with `postgresql://`)
4. Use a PostgreSQL client or run:
   ```bash
   psql "your-connection-string-here" -f database/init.sql
   ```

### 4. Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `inhm/ais-tracking-app`
3. Configure:
   - **Name**: `ais-tracking-app`
   - **Environment**: Node
   - **Region**: Same as database
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 5. Set Environment Variables
In your web service settings → Environment:

**Required Variables:**
```
NODE_ENV=production
DATABASE_URL=[Auto-filled from database connection]
PORT=3001
AIS_HOST=153.44.253.27
AIS_PORT=5631
```

**Optional Variables:**
```
CLIENT_URL=https://your-app-name.onrender.com
```

### 6. Deploy
1. Click "Create Web Service"
2. Render will automatically deploy from your GitHub repository
3. First deployment takes 3-5 minutes

### 7. Verify Deployment
Once deployed, test these endpoints:
- `https://your-app-name.onrender.com/health`
- `https://your-app-name.onrender.com/api/ships`
- `https://your-app-name.onrender.com/api/positions`

## Common Issues and Solutions

### Database Connection Issues
- Ensure DATABASE_URL is correctly set
- Check if database is in the same region as web service
- Verify database is running and accessible

### Build Issues
- Check build logs in Render dashboard
- Ensure all dependencies are in package.json
- Verify TypeScript compilation succeeds

### AIS Connection Issues
- Check if port 5631 is accessible (should be on Render)
- Monitor logs for connection status
- AIS stream may have brief interruptions

## Monitoring and Maintenance

### Health Monitoring
- Use `/health` endpoint for monitoring
- Set up Render health checks
- Monitor AIS connection status

### Logs
- Access logs from Render dashboard
- Monitor for AIS connection drops
- Check database connection status

### Scaling
- Start with Free tier
- Upgrade to Starter ($7/month) for better performance
- Consider Professional for high traffic

## Next Steps After Deployment

1. **Connect Custom Domain** (optional)
2. **Set up monitoring alerts**
3. **Implement Phase 2 features**
4. **Add SSL certificate** (automatic on Render)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `3001` |
| `AIS_HOST` | AIS stream hostname | `153.44.253.27` |
| `AIS_PORT` | AIS stream port | `5631` |
| `CLIENT_URL` | Frontend URL for CORS | `https://your-app.onrender.com` |

## Support

If you encounter issues:
1. Check Render dashboard logs
2. Verify environment variables
3. Test database connectivity
4. Check AIS stream status

The application will automatically reconnect to the AIS stream if the connection drops.