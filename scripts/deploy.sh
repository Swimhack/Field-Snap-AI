#!/bin/bash

# Field Snap AI - Deployment Script
# Deploy to snap.fly.dev

set -e

echo "🚀 Field Snap AI Deployment Script"
echo "=================================="

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is authenticated
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not authenticated with Fly.io. Please run:"
    echo "   fly auth login"
    exit 1
fi

echo "✅ Prerequisites checked"

# Check if fly.toml exists
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml not found. Please run this script from the project root."
    exit 1
fi

# Type check before deployment
echo "🔍 Running type check..."
if ! bun run type-check; then
    echo "❌ Type check failed. Please fix TypeScript errors before deploying."
    exit 1
fi

echo "✅ Type check passed"

# Check if app exists
APP_NAME="snap"
if ! fly apps list | grep -q "^$APP_NAME"; then
    echo "📦 App '$APP_NAME' doesn't exist. Creating..."
    fly launch --name $APP_NAME --region dfw --no-deploy
else
    echo "✅ App '$APP_NAME' exists"
fi

# Set essential environment variables if not already set
echo "🔧 Checking environment variables..."

# Check for required secrets
REQUIRED_SECRETS=("NODE_ENV" "API_BEARER_TOKEN")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! fly secrets list | grep -q "^$secret"; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo "⚠️  Missing required secrets: ${MISSING_SECRETS[*]}"
    echo "Setting default values..."

    for secret in "${MISSING_SECRETS[@]}"; do
        case $secret in
            "NODE_ENV")
                fly secrets set NODE_ENV=production
                ;;
            "API_BEARER_TOKEN")
                TOKEN=$(openssl rand -hex 32)
                fly secrets set API_BEARER_TOKEN=$TOKEN
                echo "🔑 Generated API Bearer Token: $TOKEN"
                echo "   Save this token - you'll need it to access the API!"
                ;;
        esac
    done
fi

echo "✅ Environment variables configured"

# Deploy
echo "🚀 Deploying to Fly.io..."
if fly deploy; then
    echo "✅ Deployment successful!"

    # Get app URL
    APP_URL=$(fly info --json | grep -o '"Hostname":"[^"]*"' | cut -d'"' -f4)

    echo ""
    echo "🌐 Your Field Snap AI app is deployed!"
    echo "   URL: https://$APP_URL"
    echo "   Dashboard: https://$APP_URL/"
    echo "   API: https://$APP_URL/api/ingest"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Set up your Supabase database credentials:"
    echo "      fly secrets set SUPABASE_URL=your-url"
    echo "      fly secrets set SUPABASE_SERVICE_ROLE_KEY=your-key"
    echo "   2. Configure OCR providers:"
    echo "      fly secrets set OPENAI_API_KEY=your-key"
    echo "      fly secrets set GOOGLE_MAPS_API_KEY=your-key"
    echo "   3. Test the deployment:"
    echo "      curl https://$APP_URL/"
    echo ""
    echo "🔧 For full setup instructions, see deploy.md"

else
    echo "❌ Deployment failed!"
    echo "   Check logs with: fly logs"
    exit 1
fi