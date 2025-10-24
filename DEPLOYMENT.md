# FieldSnapAI - Deployment Guide

## Web App Deployment to Fly.io with CI/CD

This guide covers deploying the FieldSnapAI web application to Fly.io with automatic CI/CD via GitHub Actions.

---

## Prerequisites

1. **GitHub Account** with repository access
2. **Fly.io Account** - Sign up at https://fly.io
3. **Fly.io CLI** installed locally (optional, for manual deployments)
4. **Supabase Project** - Set up at https://supabase.com

---

## Step 1: Fly.io Setup

### 1.1 Create Fly.io App (First Time Only)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Launch app (from project root)
fly launch --name fieldsnap-ai --region dfw --no-deploy

# This creates fly.toml (already exists in repo)
```

### 1.2 Get Fly.io API Token

```bash
# Generate token for GitHub Actions
fly tokens create deploy

# Copy the token - you'll need it for GitHub Secrets
```

---

## Step 2: GitHub Setup

### 2.1 Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FLY_API_TOKEN`
5. Value: Paste the token from Step 1.2
6. Click **Add secret**

### 2.2 Configure Environment Variables on Fly.io

Set your secrets on Fly.io (these won't be in git):

```bash
# Supabase
fly secrets set SUPABASE_URL="https://your-project.supabase.co"
fly secrets set SUPABASE_ANON_KEY="your-anon-key"
fly secrets set SUPABASE_SERVICE_KEY="your-service-key"

# Google Cloud Vision
fly secrets set GOOGLE_CLOUD_PROJECT_ID="your-project-id"
fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# OpenAI
fly secrets set OPENAI_API_KEY="your-openai-key"

# Twilio (optional)
fly secrets set TWILIO_ACCOUNT_SID="your-sid"
fly secrets set TWILIO_AUTH_TOKEN="your-token"
fly secrets set TWILIO_PHONE_NUMBER="+1234567890"

# Email (optional)
fly secrets set SMTP_HOST="smtp.example.com"
fly secrets set SMTP_PORT="587"
fly secrets set SMTP_USER="your-email"
fly secrets set SMTP_PASS="your-password"

# Web Push (optional)
fly secrets set VAPID_PUBLIC_KEY="your-public-key"
fly secrets set VAPID_PRIVATE_KEY="your-private-key"
fly secrets set VAPID_SUBJECT="mailto:your-email@example.com"
```

---

## Step 3: Supabase Setup

### 3.1 Create Database Tables

Run the SQL schema in your Supabase project:

1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents from `infra/supabase.sql`
3. Execute the SQL

### 3.2 Enable Row Level Security (RLS)

RLS policies are included in the schema. Verify they're enabled:

1. Go to **Authentication** → **Policies**
2. Ensure policies exist for `leads`, `users`, `notifications`, `application_logs`

### 3.3 Configure Storage

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket named `lead-images`
3. Set permissions:
   - **Public**: No
   - **File size limit**: 10MB
   - **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

---

## Step 4: Deployment

### 4.1 Automatic Deployment (CI/CD)

The app deploys automatically when you push to `main` or `master`:

```bash
git add .
git commit -m "Deploy web app"
git push origin main
```

GitHub Actions will:
1. Checkout code
2. Deploy to Fly.io automatically
3. Show deployment URL in the Actions log

### 4.2 Manual Deployment (Optional)

If you need to deploy manually:

```bash
# Deploy from local machine
fly deploy

# View logs
fly logs

# Check status
fly status

# Open app in browser
fly open
```

---

## Step 5: Verify Deployment

### 5.1 Check Health

```bash
curl https://fieldsnap-ai.fly.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-...",
  "version": "0.2.0"
}
```

### 5.2 Test API Endpoints

```bash
# Test image upload endpoint
curl -X POST https://fieldsnap-ai.fly.dev/api/leads \
  -F "image=@test-image.jpg"

# Get leads
curl https://fieldsnap-ai.fly.dev/api/leads

# Get logs
curl https://fieldsnap-ai.fly.dev/api/logs
```

---

## Step 6: Monitoring & Maintenance

### 6.1 View Logs

```bash
# Real-time logs
fly logs

# Historical logs
fly logs --search "error"
```

### 6.2 Scale Application

```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale memory 1024

# Auto-scale (already configured in fly.toml)
```

### 6.3 Update Secrets

```bash
# Update a secret
fly secrets set API_KEY="new-value"

# List all secrets (not values)
fly secrets list

# Remove a secret
fly secrets unset OLD_SECRET
```

---

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs for errors
2. Verify all dependencies are in package.json
3. Ensure TypeScript compiles locally: `npm run build`

### App Crashes on Startup

1. Check logs: `fly logs`
2. Verify environment variables are set: `fly secrets list`
3. Ensure Supabase credentials are correct

### Database Connection Issues

1. Verify Supabase URL and keys
2. Check if RLS policies are blocking requests
3. Ensure database tables exist

### API Returns 500 Errors

1. Check application logs: `fly logs`
2. Verify all required environment variables
3. Test API endpoints manually
4. Check Supabase logs

---

## Architecture Overview

```
GitHub Repository
     ↓ (git push)
GitHub Actions CI/CD
     ↓ (deploy)
Fly.io (Node.js App)
     ↓ (queries)
Supabase (PostgreSQL + Storage)
     ↓ (external APIs)
Google Vision, OpenAI, Twilio
```

---

## Useful Commands

```bash
# SSH into app
fly ssh console

# Run commands in app
fly ssh console -C "node --version"

# View app dashboard
fly dashboard

# Check app info
fly info

# View certificates
fly certs list

# Add custom domain
fly certs add yourdomain.com

# Restart app
fly apps restart fieldsnap-ai

# Destroy app (careful!)
fly apps destroy fieldsnap-ai
```

---

## Cost Estimation

**Fly.io Free Tier Includes:**
- 3 shared-cpu-1x 256mb VMs
- 160GB outbound data transfer

**Estimated Monthly Cost (if exceeding free tier):**
- Fly.io: $0-10/month (with minimal traffic)
- Supabase: Free tier sufficient for MVP
- Google Vision API: ~$1.50 per 1,000 images
- OpenAI API: ~$0.002-0.004 per image
- Twilio SMS: ~$0.0075 per message

---

## Security Checklist

- [ ] Environment variables stored as Fly.io secrets
- [ ] Supabase RLS policies enabled
- [ ] CORS configured properly
- [ ] Helmet.js enabled for security headers
- [ ] File upload size limits set
- [ ] Rate limiting implemented (TODO)
- [ ] API authentication added (TODO)
- [ ] HTTPS enforced via fly.toml

---

## Next Steps

1. **Add Authentication**: Implement Supabase Auth
2. **Implement OCR Pipeline**: Connect Google Vision API
3. **Data Enrichment**: Integrate business lookup APIs
4. **Lead Scoring**: Implement qualification logic
5. **Notifications**: Set up email/SMS alerts
6. **Analytics**: Add usage tracking
7. **Rate Limiting**: Prevent abuse
8. **Monitoring**: Set up error tracking (Sentry, etc.)

---

## Support

- **Fly.io Docs**: https://fly.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Actions**: https://docs.github.com/actions

For issues, check the GitHub repository or Fly.io community forum.
