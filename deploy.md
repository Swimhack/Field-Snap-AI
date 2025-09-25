# Deploy Field Snap AI to Snap.fly.dev

## Prerequisites

1. **Install Fly CLI**:
   ```bash
   # On Windows
   pwsh -c "iwr https://fly.io/install.ps1 -useb | iex"

   # On macOS/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Authenticate with Fly.io**:
   ```bash
   fly auth login
   ```

3. **Set up environment variables** (see Environment Setup below)

## Quick Deploy

```bash
# 1. Initialize the Fly app (first time only)
fly launch --name snap --region dfw --no-deploy

# 2. Set environment variables
fly secrets set NODE_ENV=production
fly secrets set API_BEARER_TOKEN=your-secure-token-here

# 3. Deploy
fly deploy
```

## Environment Setup

### Required Environment Variables

Set these secrets in Fly.io (replace with your actual values):

```bash
# Database (Supabase)
fly secrets set SUPABASE_URL=https://your-project.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OCR Providers
fly secrets set GOOGLE_MAPS_API_KEY=your-maps-key
fly secrets set OPENAI_API_KEY=sk-your-openai-key

# Communication (optional for demo)
fly secrets set TWILIO_ACCOUNT_SID=your-twilio-sid
fly secrets set TWILIO_AUTH_TOKEN=your-twilio-token
fly secrets set TWILIO_FROM_NUMBER=+1234567890

# Security
fly secrets set API_BEARER_TOKEN=your-secure-admin-token

# Demo Mode (set to false for live sending)
fly secrets set ALLOW_SEND=false
```

### Optional Services

For full functionality, you'll also need:

```bash
# Gmail OAuth (for email sending)
fly secrets set GMAIL_CLIENT_ID=your-gmail-client-id
fly secrets set GMAIL_CLIENT_SECRET=your-gmail-secret
fly secrets set GMAIL_REFRESH_TOKEN=your-refresh-token

# Netlify (for preview sites)
fly secrets set NETLIFY_AUTH_TOKEN=your-netlify-token
```

## Deployment Steps

### 1. First-Time Setup

```bash
# Clone and navigate to project
cd field-snap-ai

# Initialize Fly app
fly launch --name snap --region dfw --no-deploy

# This creates fly.toml if it doesn't exist
```

### 2. Configure Environment

```bash
# Set production environment
fly secrets set NODE_ENV=production

# Set API authentication
fly secrets set API_BEARER_TOKEN=$(openssl rand -hex 32)

# Set database connection
fly secrets set SUPABASE_URL=your-supabase-url
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

### 3. Deploy

```bash
# Deploy to production
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### 4. Access Your App

```bash
# Open in browser
fly open

# Or visit directly
# https://snap.fly.dev
```

## Post-Deployment Verification

### 1. Health Check

```bash
# Check if app is running
curl https://snap.fly.dev/

# Test API endpoint
curl -H "Authorization: Bearer your-token" https://snap.fly.dev/api/ingest
```

### 2. Dashboard Access

Visit `https://snap.fly.dev/` in your browser to access the Field Snap AI dashboard.

### 3. API Testing

Use the quickstart guide scenarios to test the complete pipeline:

```bash
# Test with sample data
curl -X POST https://snap.fly.dev/api/ingest \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/business-photo.jpg",
    "captured_at": "2025-01-23T15:30:00Z",
    "geo": {"lat": 29.7604, "lng": -95.3698},
    "notes": "Test deployment"
  }'
```

## Configuration Management

### View Current Secrets

```bash
fly secrets list
```

### Update Secrets

```bash
fly secrets set KEY=value
```

### Remove Secrets

```bash
fly secrets unset KEY
```

## Scaling and Monitoring

### Scale Resources

```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale memory 1024

# Scale to specific regions
fly scale count 1 --region dfw
```

### Monitor Performance

```bash
# View logs in real-time
fly logs -f

# Check resource usage
fly status --all

# View metrics
fly dashboard
```

## Troubleshooting

### Common Issues

1. **App won't start**:
   ```bash
   fly logs
   # Check for missing environment variables or build errors
   ```

2. **Database connection errors**:
   ```bash
   # Verify Supabase credentials
   fly secrets list | grep SUPABASE
   ```

3. **API authentication errors**:
   ```bash
   # Check API bearer token
   fly secrets list | grep API_BEARER_TOKEN
   ```

### Debug Commands

```bash
# SSH into running instance
fly ssh console

# Check environment variables
fly ssh console -C "env | grep -E '(SUPABASE|API)'"

# Restart app
fly restart
```

## Custom Domain (Optional)

### Add Custom Domain

```bash
# Add domain
fly certs add your-domain.com

# Check certificate status
fly certs show your-domain.com
```

### DNS Configuration

Point your domain to Fly.io:

```
A record: your-domain.com → [Fly.io IP from certs command]
AAAA record: your-domain.com → [Fly.io IPv6 from certs command]
```

## Security Considerations

1. **Rotate API tokens** regularly:
   ```bash
   fly secrets set API_BEARER_TOKEN=$(openssl rand -hex 32)
   ```

2. **Use environment-specific configurations**:
   - Production: `ALLOW_SEND=false` for demo mode
   - Staging: Separate Supabase project

3. **Monitor access logs**:
   ```bash
   fly logs | grep "api/ingest"
   ```

## Cost Optimization

1. **Auto-stop machines** when idle (already configured in fly.toml)
2. **Use shared CPU** for development (configured)
3. **Monitor usage**:
   ```bash
   fly dashboard
   ```

## Backup and Recovery

1. **Database backups** are handled by Supabase
2. **Application state** is stateless - no additional backup needed
3. **Environment variables** should be documented securely

---

Your Field Snap AI app will be available at: **https://snap.fly.dev**

For support, check the [Fly.io documentation](https://fly.io/docs/) or the Field Snap AI quickstart guide.