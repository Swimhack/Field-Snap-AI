# Data Model: Field Snap AI MVP

**Phase**: 1 - Design & Contracts
**Created**: 2025-01-23
**Input**: Feature specification entities and requirements

## Entity Definitions

### Lead
**Purpose**: Primary business record containing extracted information from business advertisement photos
**Storage**: PostgreSQL with UUID primary key
**Lifecycle**: Created → Processing → Enriched → Scored → Outreach → Archived (1 year)

**Attributes**:
- `id` (UUID, PK): Unique lead identifier
- `image_url` (TEXT, NOT NULL): URL to original business photo in Supabase storage
- `ocr_text` (TEXT): Raw text extracted from image via OCR
- `business_name` (VARCHAR(255)): Extracted business name
- `subtitle` (TEXT[]): Business taglines or descriptions
- `services` (TEXT[]): Array of business services offered
- `phone` (VARCHAR(20)): Normalized phone number (E.164 format)
- `email` (VARCHAR(255)): Business email address
- `website` (VARCHAR(500)): Business website URL
- `address` (TEXT): Street address from image
- `city` (VARCHAR(100)): Business city
- `state` (VARCHAR(50)): Business state
- `postal_code` (VARCHAR(20)): ZIP code
- `area_code` (VARCHAR(10)): Phone area code for geographic analysis
- `colors` (TEXT[]): Extracted color scheme from image
- `tags` (TEXT[]): Business category tags
- `visual_elements` (JSONB): Structured visual data (logos, graphics, layout)
- `confidence` (NUMERIC(3,2)): OCR confidence score (0.00-1.00)
- `processing_status` (ENUM): 'pending', 'processing', 'enriched', 'scored', 'needs_review', 'completed', 'failed'
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Unique index on (phone, city) for deduplication
- Index on area_code for geographic queries
- Index on processing_status for dashboard filtering
- Index on created_at for chronological ordering

**Constraints**:
- Phone number format validation
- Email format validation
- Confidence must be between 0.00 and 1.00
- At least one of phone, email, or website must be present

### Lead Enrichment
**Purpose**: Supplementary data collected from external sources to enhance lead quality
**Storage**: PostgreSQL with foreign key to Lead
**Lifecycle**: Created after successful lead processing

**Attributes**:
- `id` (UUID, PK): Unique enrichment identifier
- `lead_id` (UUID, FK): Reference to parent lead
- `website_found` (BOOLEAN): Whether business website was discovered
- `website_quality` (NUMERIC(3,2)): Website quality score (0.00-1.00)
- `socials` (JSONB): Social media profiles `{facebook: url, instagram: url, linkedin: url}`
- `listings` (JSONB): Business directory listings `{google_maps: {url, place_id}, yelp: {url, business_id}}`
- `reviews` (JSONB): Review aggregation `{total_count: number, avg_rating: number, sources: []}`
- `category` (VARCHAR(100)): Primary business category
- `subcategory` (VARCHAR(100)): Business subcategory
- `data_sources` (TEXT[]): Array of sources used `['google_maps', 'yelp', 'facebook']`
- `enriched_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Primary index on lead_id (one-to-one relationship)
- Index on category for business type filtering
- Index on enriched_at for freshness queries

**Constraints**:
- Each lead can have at most one enrichment record
- data_sources array must not be empty
- website_quality only set if website_found is true

### Lead Scoring
**Purpose**: Calculated assessment with numerical score and rationale for lead qualification
**Storage**: PostgreSQL with foreign key to Lead
**Lifecycle**: Created after enrichment completion

**Attributes**:
- `id` (UUID, PK): Unique scoring identifier
- `lead_id` (UUID, FK): Reference to parent lead
- `score` (NUMERIC(4,2)): Lead score (0.00-10.00)
- `rationale` (TEXT): Detailed explanation of scoring factors
- `recommended_offers` (TEXT[]): Service recommendations based on analysis
- `priority` (ENUM): 'low', 'medium', 'high' based on score thresholds
- `scoring_factors` (JSONB): Breakdown of score components
- `calculated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Scoring Rules** (as per specification):
- No website or site down: +3 points
- Site >3 years old or non-responsive: +2 points
- Revenue services present: +1 point
- Distinct phone & brand present: +1 point
- Reviews present but <20 or rating <4.0: +1 point
- "FREE ESTIMATES" or similar CTA: +1 point

**Priority Thresholds**:
- High: score >= 8.0
- Medium: score >= 5.0 and < 8.0
- Low: score < 5.0

**Indexes**:
- Primary index on lead_id (one-to-one relationship)
- Index on score for ranking queries
- Index on priority for dashboard filtering
- Index on calculated_at for temporal analysis

### Outreach
**Purpose**: Generated communication content and delivery tracking
**Storage**: PostgreSQL with foreign key to Lead
**Lifecycle**: Multiple records per lead (SMS, email, follow-ups)

**Attributes**:
- `id` (UUID, PK): Unique outreach identifier
- `lead_id` (UUID, FK): Reference to parent lead
- `channel` (ENUM): 'sms', 'email', 'phone', 'manual'
- `to_contact` (VARCHAR(255)): Recipient contact (phone or email)
- `subject` (VARCHAR(200)): Email subject or SMS preview
- `body` (TEXT): Message content
- `preview_url` (VARCHAR(500)): URL to generated preview website
- `sent_at` (TIMESTAMPTZ): Timestamp when message was sent
- `status` (ENUM): 'draft', 'approved', 'sent', 'delivered', 'failed', 'bounced'
- `provider_response` (JSONB): Delivery confirmation from Twilio/email provider
- `meta` (JSONB): Additional metadata (campaign tracking, A/B test variant)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Index on lead_id for lead history queries
- Index on channel for communication type filtering
- Index on status for delivery tracking
- Index on sent_at for temporal analysis

**Constraints**:
- SMS body must be <= 300 characters
- Email body must be <= 1000 words (approximately 120 words as specified)
- to_contact format validation based on channel
- sent_at must be null if status is 'draft' or 'approved'

## Relationships

### Primary Relationships
- **Lead → Lead Enrichment**: One-to-one (optional)
- **Lead → Lead Scoring**: One-to-one (optional)
- **Lead → Outreach**: One-to-many

### Cascade Rules
- Lead deletion cascades to all related records
- Enrichment update triggers lead updated_at
- Scoring calculation updates lead processing_status

## Data Validation Rules

### Phone Number Normalization
- Input format: Various (`(555) 123-4567`, `555-123-4567`, `+1-555-123-4567`)
- Storage format: E.164 (`+15551234567`)
- Validation: US phone numbers only (area codes 200-999)

### Geographic Validation
- US state codes validated against standard list
- ZIP codes validated for format (5 digits or 5+4)
- City names normalized for consistent scoring

### Quality Thresholds
- OCR confidence < 0.6 → processing_status = 'needs_review'
- Missing phone AND email AND website → processing_status = 'failed'
- Business name confidence < 0.4 → manual review required

## Database Performance Considerations

### Partitioning Strategy
- Lead table partitioned by created_at (monthly partitions)
- Automatic partition creation for future months
- Archive partitions older than 1 year per retention policy

### Connection Management
- Connection pooling with 10-20 connections for API tier
- Read replicas for dashboard queries
- Connection timeout: 30 seconds

### Backup and Recovery
- Daily full backups with point-in-time recovery
- Cross-region replication for disaster recovery
- Automated testing of backup restoration

## Data Retention and Archival

### Retention Policy (per clarifications)
- Lead data: 1 year from creation
- Images: 1 year in Supabase storage
- Logs: 90 days for operational data
- Analytics aggregates: 3 years

### Archival Process
- Automated monthly job to identify expired data
- Export to cold storage before deletion
- Audit trail for all deletion activities
- GDPR-style right to deletion support

This data model supports all functional requirements while maintaining referential integrity and enabling efficient queries for the dashboard and API operations.