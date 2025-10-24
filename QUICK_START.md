# FieldSnapAI - Quick Start Guide

## Deploy to Fly.io in 5 Minutes

This is the **web-only version** of FieldSnapAI built with HTML5, CSS3, Node.js/Express, and Supabase PostgreSQL.

---

## ⚡ Super Quick Deploy

### 1. Set up Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Get deploy token for GitHub
fly tokens create deploy
# Save this token - you'll add it to GitHub secrets
```

### 2. Configure GitHub

1. Go to your repo → **Settings** → **Secrets** → **Actions**
2. Add secret: `FLY_API_TOKEN` = (token from step 1)

### 3. Set Supabase Secrets on Fly.io

```bash
fly secrets set SUPABASE_URL="https://xxx.supabase.co"
fly secrets set SUPABASE_ANON_KEY="your-key"
fly secrets set SUPABASE_SERVICE_KEY="your-service-key"
```

### 4. Deploy!

```bash
git add .
git commit -m "Deploy web app"
git push origin main
```

✅ Done! Your app will deploy automatically via GitHub Actions.

---

## 🌐 Access Your App

After deployment:
- **Web App**: https://fieldsnap-ai.fly.dev
- **API**: https://fieldsnap-ai.fly.dev/api/leads
- **Health Check**: https://fieldsnap-ai.fly.dev/health

---

## 📋 What's Included

### Frontend
- ✅ HTML5/CSS3 responsive interface
- ✅ Camera capture for mobile devices
- ✅ Image upload functionality
- ✅ Lead management dashboard
- ✅ Progressive Web App features

### Backend (Express API)
- ✅ REST API endpoints
- ✅ File upload handling (multer)
- ✅ CORS and security (helmet)
- ✅ Supabase integration ready
- ✅ OCR pipeline structure (Google Vision + OpenAI)

### CI/CD
- ✅ GitHub Actions workflow
- ✅ Automatic deployment to Fly.io
- ✅ Push to main = auto deploy

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **OCR** | Google Vision API, OpenAI (fallback) |
| **Deployment** | Fly.io |
| **CI/CD** | GitHub Actions |

---

## 📦 Project Structure

```
FieldSnapAI/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── public/                     # Frontend files
│   ├── index.html             # Main web app
│   ├── styles.css             # Styling
│   ├── app.js                 # Frontend JavaScript
│   └── manifest.json          # PWA manifest
├── src/
│   ├── server.ts              # Express API server
│   ├── core/
│   │   └── types.ts           # TypeScript types
│   ├── providers/             # Service providers
│   │   ├── db.ts             # Supabase client
│   │   ├── ocr.ts            # OCR processing
│   │   ├── enrich.ts         # Data enrichment
│   │   └── scoring.ts        # Lead scoring
│   └── utils/
│       └── logger.ts          # Logging utility
├── Dockerfile                  # Production container
├── fly.toml                    # Fly.io configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── DEPLOYMENT.md              # Full deployment guide
```

---

## 🔧 Local Development (Optional)

If you want to test locally before deploying:

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

App runs at: http://localhost:8080

---

## 📝 Environment Variables

Required secrets (set via `fly secrets set`):

```bash
# Minimum required
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY

# For full functionality
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS_JSON
OPENAI_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
SMTP_HOST
SMTP_USER
SMTP_PASS
```

See `.env.example` for complete list.

---

## 🚀 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/leads` | Upload image, create lead |
| GET | `/api/leads` | Get all leads |
| GET | `/api/leads/:id` | Get lead details |
| PUT | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/logs` | Get application logs |

---

## 🔄 Continuous Deployment

Every push to `main` or `master` triggers automatic deployment:

1. GitHub Actions runs
2. Checks out code
3. Deploys to Fly.io
4. App is live in ~2-3 minutes

View deployment status: **Actions** tab in GitHub

---

## 📖 Full Documentation

- **Complete Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Original README**: [README.md](./README.md)
- **Supabase Schema**: [infra/supabase.sql](./infra/supabase.sql)

---

## 🆘 Troubleshooting

### Build fails on Fly.io
```bash
# Check GitHub Actions logs
# Ensure all dependencies are in package.json
npm run build  # Test build locally
```

### App won't start
```bash
fly logs  # Check runtime errors
fly secrets list  # Verify secrets are set
```

### Database errors
- Verify Supabase credentials
- Run schema from `infra/supabase.sql`
- Check RLS policies are enabled

---

## ✅ Next Steps After Deployment

1. [ ] Test image upload: Visit your app URL
2. [ ] Configure Supabase tables: Run schema SQL
3. [ ] Add optional API keys: Google Vision, OpenAI
4. [ ] Test OCR functionality
5. [ ] Implement authentication (Supabase Auth)
6. [ ] Add lead enrichment integrations
7. [ ] Set up notifications (email/SMS)

---

## 💡 Tips

- **Free tier**: Fly.io gives you 3 free VMs
- **Zero downtime**: Fly.io handles deployments with rolling updates
- **Logs**: `fly logs` for debugging
- **Scaling**: `fly scale count 2` for more instances
- **Custom domain**: `fly certs add yourdomain.com`

---

## 📞 Support

- **Fly.io**: https://community.fly.io
- **Supabase**: https://supabase.com/docs
- **Issues**: Open a GitHub issue

---

**Ready to capture leads? Push to deploy! 🚀**
