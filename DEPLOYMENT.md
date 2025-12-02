# Deploying Physio7-BI Scraper with Dokploy

This guide explains how to deploy the Physio7-BI scraper to a server using Dokploy.

## Prerequisites

- A VPS or dedicated server (minimum 2GB RAM, 4GB recommended for Chromium)
- Docker installed on the server
- Dokploy installed and running
- A production Supabase instance (or use local Supabase on the same server)
- Git repository with your code pushed

## Step 1: Prepare Your Server

### Install Docker (if not already installed)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Install Dokploy

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Access Dokploy at: `http://your-server-ip:3000`

## Step 2: Set Up Supabase (Production)

You have two options:

### Option A: Use Supabase Cloud

1. Create a project at https://supabase.com
2. Get your project URL and anon key from Settings > API

### Option B: Self-host Supabase on the same server

```bash
# Create directory for Supabase
mkdir -p ~/supabase
cd ~/supabase

# Initialize Supabase
npx supabase init

# Start Supabase
npx supabase start
```

Note the API URL and anon key from the output.

## Step 3: Configure Dokploy

### 1. Create New Application

1. Log in to Dokploy dashboard
2. Click **"Create Application"**
3. Choose **"Git Repository"**

### 2. Connect Repository

1. Add your Git provider (GitHub/GitLab)
2. Select the `physio-7-bi` repository
3. Choose branch: `main`

### 3. Configure Build Settings

- **Build Method**: Docker
- **Dockerfile Path**: `./Dockerfile`
- **Build Context**: `.`

### 4. Set Environment Variables

Add the following environment variables in Dokploy:

```env
MEDIONLINE_USERNAME=your_medionline_username
MEDIONLINE_PASSWORD=your_medionline_password
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important**: Use your production Supabase credentials, not local ones.

### 5. Configure Resources

**Important**: Set appropriate resource limits for Chromium:

- **Memory Limit**: 4GB (recommended for stable browser automation)
- **CPU Limit**: 1-2 CPUs
- **Restart Policy**: `unless-stopped`

The Docker image includes:

- Node.js 20
- Chromium browser (installed by Playwright with `--with-deps`)
- All required system dependencies automatically managed

## Step 4: Deploy

1. Click **"Deploy"** in Dokploy
2. Monitor the build logs
3. Wait for deployment to complete

## Step 5: Verify Deployment

### Check Logs

In Dokploy dashboard:

1. Go to your application
2. Click on **"Logs"**
3. You should see: `Scheduler started. Scraper will run daily at 2:00 AM`

### Test the Scraper

The scraper runs automatically at 2:00 AM daily. To test immediately:

1. SSH into your server
2. Find the container ID:
   ```bash
   docker ps | grep physio7-bi
   ```
3. Execute a test run:
   ```bash
   docker exec -it <container-id> node dist/scrapers/patients.js
   ```

### Verify Data in Supabase

1. Open your Supabase dashboard
2. Go to **Table Editor**
3. Check the `patients`, `appointments`, and `invoices` tables
4. Verify data is being inserted

## Schedule Configuration

The scraper runs daily at **2:00 AM (Europe/Zurich timezone)**.

To change the schedule, edit `src/scheduler.ts`:

```typescript
// Current: Daily at 2:00 AM
cron.schedule('0 2 * * *', async () => { ... });

// Examples:
// Every 6 hours: '0 */6 * * *'
// Twice daily (2 AM and 2 PM): '0 2,14 * * *'
// Every Monday at 3 AM: '0 3 * * 1'
```

After changing, redeploy in Dokploy.

## Monitoring

### View Logs

```bash
# Real-time logs
docker logs -f <container-id>

# Last 100 lines
docker logs --tail 100 <container-id>
```

### Set Up Alerts (Optional)

Configure Dokploy webhooks to notify you on:

- Deployment failures
- Container crashes
- Memory/CPU issues

## Troubleshooting

### Container Keeps Restarting

Check logs:

```bash
docker logs <container-id>
```

Common issues:

- Missing environment variables
- Invalid Supabase credentials
- MediOnline login failure

### Chromium Crashes

Increase memory limit in Dokploy settings to 4GB. The Playwright browser requires more memory than a typical Node.js application.

If issues persist:

- Check Docker logs for memory-related errors
- Ensure your server has sufficient RAM available
- Consider using a server with more resources

### Scraper Not Running on Schedule

1. Check container is running:
   ```bash
   docker ps | grep physio7-bi
   ```
2. Verify timezone in logs
3. Check cron expression in `scheduler.ts`

### Database Connection Errors

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Check network connectivity from container to Supabase
- Ensure Supabase project is running

## Manual Execution

To run the scraper manually:

```bash
# SSH into server
ssh user@your-server-ip

# Find container
docker ps | grep physio7-bi

# Run scraper
docker exec -it <container-id> node dist/scrapers/patients.js
```

## Updating the Application

1. Push changes to your Git repository
2. In Dokploy, click **"Redeploy"**
3. Monitor build and deployment logs

## Stopping/Starting the Scraper

### Stop

```bash
docker stop <container-id>
```

Or in Dokploy: Click **"Stop"**

### Start

```bash
docker start <container-id>
```

Or in Dokploy: Click **"Start"**

## Backup Recommendations

1. **Regular Supabase Backups**: Configure automatic backups in Supabase dashboard
2. **Database Exports**: Schedule periodic exports of your data
3. **Monitor Disk Space**: Ensure server has sufficient storage

## Security Considerations

1. **Environment Variables**: Never commit credentials to Git
2. **Server Access**: Use SSH keys, disable password authentication
3. **Firewall**: Only expose necessary ports (80, 443, 3000 for Dokploy)
4. **Supabase RLS**: Enable Row Level Security policies
5. **Regular Updates**: Keep Docker and Dokploy updated

## Support

## Cost Estimation

**Monthly costs (approximate):**

- VPS (4GB RAM, 2 CPUs): $20-40/month
- Supabase Free Tier: $0 (up to 500MB database, 2GB file storage)
- Supabase Pro (if needed): $25/month

**Total**: $20-65/month depending on your setup

**Note**: The scraper requires more resources due to Chromium browser automation. A 4GB RAM VPS is recommended for production use.

- VPS (2GB RAM, 1 CPU): $10-20/month
- Supabase Free Tier: $0 (up to 500MB database, 2GB file storage)
- Supabase Pro (if needed): $25/month

**Total**: $10-45/month depending on your setup
