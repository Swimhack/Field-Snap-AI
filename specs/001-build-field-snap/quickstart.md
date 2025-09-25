# Quickstart Guide: Field Snap AI MVP

**Phase**: 1 - Design & Contracts
**Created**: 2025-01-23
**Purpose**: Validate complete system functionality through end-to-end testing scenarios

## Overview
This quickstart guide provides step-by-step validation of the Field Snap AI MVP functionality. It covers the complete pipeline from photo ingestion to outreach generation, including manual testing procedures and automated validation scripts.

## Prerequisites

### Environment Setup
1. **Bun Runtime**: Version 1.0+ installed
2. **Environment Variables**: All required API keys configured in `.env`
3. **Database**: Supabase project with schema applied
4. **Storage**: Supabase buckets created (leads-raw, leads-ocr, leads-thumbs)
5. **API Keys**: Google Vision, OpenAI, Twilio, Gmail OAuth configured
6. **Netlify**: Account setup with deployment tokens

### Required Environment Variables
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OCR Providers
GOOGLE_APPLICATION_CREDENTIALS=./infra/gcp.json
OPENAI_API_KEY=sk-your-openai-key

# Enrichment APIs
GOOGLE_MAPS_API_KEY=your-maps-key
YELP_API_KEY=your-yelp-key

# Communication
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-secret
GMAIL_REFRESH_TOKEN=your-refresh-token

# Deployment
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_NAME_PREFIX=fieldsnap-

# Security
API_BEARER_TOKEN=your-secure-admin-token
ALLOW_SEND=false

# Performance
API_RATE_LIMIT_RPM=60
OCR_TIMEOUT_MS=10000
ENRICHMENT_TIMEOUT_MS=5000
```

## Quick Validation (5 minutes)

### 1. Start the Development Server
```bash
# Install dependencies
bun install

# Type checking
bun run type-check

# Start development server
bun run dev
```

Expected output:
```
✓ TypeScript compilation successful
✓ Server started on http://localhost:3001
✓ Database connection established
✓ All external APIs accessible
```

### 2. Health Check Validation
```bash
# Test all health endpoints
curl -H "Authorization: Bearer $API_BEARER_TOKEN" http://localhost:3001/api/health/db
curl -H "Authorization: Bearer $API_BEARER_TOKEN" http://localhost:3001/api/health/ocr
curl -H "Authorization: Bearer $API_BEARER_TOKEN" http://localhost:3001/api/health/notifications
```

Expected responses: All should return `{"status": "healthy"}` with 200 status codes.

### 3. Demo Script Execution
```bash
# Run automated demo with sample data
bun run scripts/demo-run.ts
```

Expected output:
```
✓ Sample image uploaded: melendez_trailer.jpg
✓ OCR processing completed (confidence: 0.87)
✓ Business enrichment completed (3 sources)
✓ Lead scoring completed (score: 8.2, priority: high)
✓ Preview site generated: https://fieldsnap-uuid.netlify.app
✓ SMS draft created (287 characters)
✓ Email draft created (118 words)
✓ Pipeline completed in 1.8 seconds
```

## Complete End-to-End Testing (15 minutes)

### Scenario 1: Landscaping Truck Wrap (Happy Path)

#### Input Data
```json
{
  "image_url": "https://supabase.co/storage/v1/object/public/leads-raw/samples/melendez_trailer.jpg",
  "captured_at": "2025-01-23T15:30:00Z",
  "geo": {"lat": 29.7604, "lng": -95.3698},
  "notes": "Truck wrap on I-45 near downtown Houston"
}
```

#### Step 1: Image Ingestion
```bash
curl -X POST http://localhost:3001/api/ingest \
  -H "Authorization: Bearer $API_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://supabase.co/storage/v1/object/public/leads-raw/samples/melendez_trailer.jpg",
    "captured_at": "2025-01-23T15:30:00Z",
    "geo": {"lat": 29.7604, "lng": -95.3698},
    "notes": "Truck wrap on I-45 near downtown Houston"
  }'
```

Expected response:
```json
{
  "success": true,
  "lead_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Lead processing started successfully",
  "processing_id": "req_1706026200_xyz789"
}
```

#### Step 2: Processing Validation
Wait 2 minutes, then check lead status:
```bash
curl -H "Authorization: Bearer $API_BEARER_TOKEN" \
  http://localhost:3001/api/leads/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Expected data structure:
```json
{
  "lead": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "business_name": "Meléndez Landscaping",
    "phone": "+15551234567",
    "services": ["Tree Service", "Lawn Care", "Fertilizing"],
    "city": "Houston",
    "state": "TX",
    "confidence": 0.87,
    "processing_status": "completed"
  },
  "enrichment": {
    "website_found": false,
    "category": "Landscaping Services",
    "reviews": {"total_count": 12, "avg_rating": 4.2}
  },
  "scoring": {
    "score": 8.2,
    "priority": "high",
    "rationale": "No website found (+3), distinct phone & brand (+1), revenue services present (+1), reviews <20 (+1), truck wrap visibility (+2.2)",
    "recommended_offers": ["Website creation", "Google Business Profile setup", "Call tracking system"]
  },
  "outreach": [
    {
      "channel": "sms",
      "subject": "Website for Meléndez Landscaping",
      "body": "Hi! Saw your truck on I-45. Your landscaping work looks great! Most customers now search online first - we help local businesses like yours get found with professional websites & Google setup. Quick 5min call? Reply STOP to opt out.",
      "preview_url": "https://fieldsnap-melendez.netlify.app",
      "status": "draft"
    }
  ]
}
```

#### Step 3: Preview Site Validation
Visit the generated preview URL and verify:
- [ ] Business name displayed prominently
- [ ] Phone number clickable (tel: link)
- [ ] Services listed clearly
- [ ] Color scheme extracted from original image
- [ ] Mobile-responsive design
- [ ] Professional appearance

#### Step 4: Dashboard Integration
Open http://localhost:3001/dashboard and verify:
- [ ] Lead appears in list view
- [ ] Thumbnail image displays
- [ ] Score and priority visible
- [ ] "Approve & Send" button available
- [ ] Preview link opens correctly

### Scenario 2: Blurry Storefront (Low Confidence)

#### Input Data
```json
{
  "image_url": "https://supabase.co/storage/v1/object/public/leads-raw/samples/blurry_storefront.jpg",
  "captured_at": "2025-01-23T16:00:00Z",
  "geo": {"lat": 40.7128, "lng": -74.0060},
  "notes": "Blurry photo of restaurant storefront"
}
```

#### Expected Processing Results
- OCR confidence: < 0.6
- Processing status: "needs_review"
- Dashboard: Lead appears in "Needs Review" section
- Manual verification required before outreach

### Scenario 3: Business with Existing Website (Low Priority)

#### Input Data
```json
{
  "image_url": "https://supabase.co/storage/v1/object/public/leads-raw/samples/established_business.jpg",
  "captured_at": "2025-01-23T16:30:00Z",
  "geo": {"lat": 34.0522, "lng": -118.2437},
  "notes": "Well-established business with professional signage"
}
```

#### Expected Processing Results
- Enrichment finds modern website
- Multiple positive reviews (>20, rating >4.5)
- Score: 3.5 (low priority)
- Recommended offers focus on advanced services (SEO, analytics)

## Pipeline Replay Testing

### Test Replay Functionality
```bash
# Replay processing for existing lead
curl -X POST http://localhost:3001/api/leads/a1b2c3d4-e5f6-7890-abcd-ef1234567890/replay \
  -H "Authorization: Bearer $API_BEARER_TOKEN"
```

Expected behavior:
- Enrichment data updated with fresh API calls
- Scoring recalculated with current criteria
- New outreach generated if scoring changes
- Processing timestamps updated

## Error Handling Validation

### Test Invalid Image URL
```bash
curl -X POST http://localhost:3001/api/ingest \
  -H "Authorization: Bearer $API_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://invalid-url.com/missing.jpg"}'
```

Expected: 400 error with descriptive message

### Test API Rate Limiting
Execute 5 rapid requests within 1 minute to trigger rate limiting.
Expected: 429 error with retry-after header

### Test External API Failures
Temporarily disable internet connection and submit lead.
Expected: Processing status remains "processing", resumes when connectivity restored

## Performance Validation

### Response Time Testing
```bash
# Measure API response times
time curl -H "Authorization: Bearer $API_BEARER_TOKEN" http://localhost:3001/api/leads

# Should complete in <200ms for list endpoint
# Full pipeline should complete in <2 minutes
```

### Load Testing (Optional)
```bash
# Install load testing tool
bun add -D autocannon

# Test API under load
bunx autocannon -c 10 -d 30 -H "Authorization: Bearer $API_BEARER_TOKEN" http://localhost:3001/api/health/db
```

## Dry Run vs Live Testing

### Dry Run Mode (Default)
- `ALLOW_SEND=false` in environment
- SMS and email generated but not sent
- Twilio and Gmail APIs not called for actual delivery
- All other processing runs normally

### Live Testing (Optional)
- Set `ALLOW_SEND=true` in environment
- Use test phone number and email
- Verify actual message delivery
- Monitor delivery status in dashboard

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify Supabase URL and service role key
- Check database schema is applied
- Ensure RLS policies allow service role access

**OCR Processing Failures**
- Verify Google Cloud credentials file exists
- Check OpenAI API key validity
- Ensure image URLs are publicly accessible

**Enrichment API Errors**
- Verify Google Maps API key has Places API enabled
- Check Yelp API key validity and rate limits
- Monitor API quota usage

**Preview Site Generation Failures**
- Verify Netlify auth token permissions
- Check site name prefix uniqueness
- Monitor Netlify build logs

**Authentication Errors**
- Verify API bearer token matches environment variable
- Check token format (should not include "Bearer " prefix in env var)

### Debug Mode
```bash
# Run with debug logging
DEBUG=* bun run dev

# Check specific component logs
curl -H "Authorization: Bearer $API_BEARER_TOKEN" \
  "http://localhost:3001/api/logs?component=ocr&level=error&limit=50"
```

## Success Criteria

### Functional Requirements Met
- [ ] Complete pipeline processes sample image in <2 minutes
- [ ] OCR extracts business name, phone, services accurately
- [ ] Enrichment finds and validates business information
- [ ] Scoring produces logical results with clear rationale
- [ ] Preview sites deploy successfully with professional design
- [ ] SMS and email content meets character/word limits
- [ ] Dashboard provides complete lead management interface

### Performance Requirements Met
- [ ] API responses consistently <200ms
- [ ] OCR processing <3 seconds
- [ ] Lead scoring <500ms
- [ ] Queue processing maintains order
- [ ] Database queries optimized with appropriate indexes

### Security Requirements Met
- [ ] Bearer token authentication working
- [ ] All inputs properly validated
- [ ] External API keys secured in environment variables
- [ ] Error messages don't expose sensitive information
- [ ] Audit logging captures all significant events

### Constitution Compliance
- [ ] TypeScript strict mode compiles without errors
- [ ] Tests written for all critical functionality
- [ ] Mobile-first dashboard interface
- [ ] All external API calls properly validated
- [ ] Performance budgets respected

This quickstart guide ensures the Field Snap AI MVP meets all functional and non-functional requirements while providing a reliable foundation for production deployment.