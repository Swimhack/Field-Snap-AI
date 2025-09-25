# Research: Field Snap AI MVP Technical Decisions

**Phase**: 0 - Outline & Research
**Created**: 2025-01-23
**Input**: Technical Context from plan.md

## Research Methodology
All technical choices were well-defined in the original specification and clarifications. No NEEDS CLARIFICATION items were identified during Technical Context analysis.

## Technology Stack Decisions

### Runtime & Language
**Decision**: TypeScript 5.3+ with Bun 1.0+ runtime
**Rationale**:
- TypeScript provides compile-time type safety aligned with Constitution principle I
- Bun offers superior performance for TypeScript execution and package management
- Native ESM support and fast startup times ideal for serverless functions
**Alternatives considered**: Node.js 20+ (more mature but slower), Deno (less ecosystem)

### Database & Storage
**Decision**: Supabase (PostgreSQL + Storage + Real-time)
**Rationale**:
- PostgreSQL provides ACID compliance for lead data integrity
- Built-in file storage eliminates need for separate S3 setup
- Row-level security aligns with single admin authentication model
- Real-time subscriptions enable live dashboard updates
**Alternatives considered**: Raw PostgreSQL + S3 (more complex), Firebase (vendor lock-in)

### OCR Provider Strategy
**Decision**: Google Cloud Vision API primary, OpenAI Vision API fallback
**Rationale**:
- Google Vision offers superior text detection accuracy for business signage
- Structured bounding box data essential for confidence scoring
- OpenAI provides robust fallback with different processing approach
- Provider abstraction enables easy swapping based on performance
**Alternatives considered**: AWS Textract (less accurate), Azure Computer Vision (slower)

### Queue & Job Processing
**Decision**: Queue-based serialization with BullMQ or simple in-memory queue
**Rationale**:
- Clarification specified queue-based processing to avoid rate limits
- Serialization prevents concurrent API calls from hitting limits
- Redis-backed queues (BullMQ) provide persistence and retry logic
- Simple in-memory queue sufficient for MVP with low volume
**Alternatives considered**: Concurrent processing with backoff (rejected per clarifications)

### Frontend Framework
**Decision**: React with Vite for dashboard, progressive enhancement
**Rationale**:
- Mobile-first requirement demands responsive, touch-friendly interface
- Component-based architecture enables modular dashboard features
- Vite provides fast development and optimized production builds
- Server-side rendering not required for admin-only dashboard
**Alternatives considered**: Next.js (over-engineered for simple dashboard), Vue (team preference)

### Deployment & Hosting
**Decision**: Netlify for preview sites, Supabase Edge Functions or Railway for API
**Rationale**:
- Netlify API enables programmatic site deployment for preview generation
- Edge Functions provide serverless scaling aligned with performance budgets
- Railway offers simple deployment with database proximity
- Preview sites require unique URLs with reliable uptime
**Alternatives considered**: Vercel (similar capabilities), self-hosted (more complex)

### Communication Providers
**Decision**: Twilio for SMS, Nodemailer with Gmail OAuth for email
**Rationale**:
- Twilio provides reliable SMS delivery with detailed status tracking
- Gmail OAuth avoids SMTP server management complexity
- Both services offer comprehensive APIs for delivery confirmation
- Cost-effective for MVP volume with clear pricing models
**Alternatives considered**: SendGrid (email only), AWS SES (more complex setup)

## Architecture Patterns

### Provider Pattern Implementation
**Decision**: Interface-based providers with dependency injection
**Rationale**:
- Enables easy testing with mock implementations
- Supports provider switching (OCR, email, SMS) without code changes
- Aligns with SOLID principles and maintainable architecture
- Facilitates different configurations for dev/staging/production

### Error Handling Strategy
**Decision**: Structured logging with error boundaries and graceful degradation
**Rationale**:
- Comprehensive audit trail required per specification
- External API failures should not break entire pipeline
- Confidence thresholds enable manual review of low-quality OCR
- Status tracking enables pipeline resume after failures

### Data Validation Approach
**Decision**: Zod schemas at all boundaries with TypeScript inference
**Rationale**:
- Runtime validation ensures data integrity from external sources
- TypeScript inference maintains type safety without duplication
- Schema evolution supports API versioning and migration
- Validation errors provide clear feedback for debugging

## Performance Optimization Strategy

### Caching Implementation
**Decision**: Multi-level caching - Redis for API responses, CDN for static assets
**Rationale**:
- Business enrichment data changes infrequently, suitable for caching
- Image thumbnails and processed assets benefit from CDN distribution
- Cache invalidation based on data freshness requirements (1 hour for enrichment)

### Database Optimization
**Decision**: Indexes on phone numbers and cities, connection pooling
**Rationale**:
- Lead deduplication requires fast lookups on normalized phone + city
- Geographic queries for scoring need efficient city-based filtering
- Connection pooling prevents database bottlenecks under load

### API Rate Limiting
**Decision**: Token bucket algorithm with queue-based serialization
**Rationale**:
- Prevents bursts from overwhelming external APIs
- Queue ensures fair processing order per clarification requirements
- Exponential backoff for temporary failures

## Security Considerations

### Authentication Model
**Decision**: Single bearer token with API key rotation capability
**Rationale**:
- Clarification specified single admin access model
- Simple token validation reduces authentication complexity
- API key rotation enables security without downtime
- Audit logging tracks all access for compliance

### Data Protection
**Decision**: Encryption at rest and in transit, automated data retention
**Rationale**:
- Business contact information requires protection
- 1-year retention policy needs automated enforcement
- GDPR-style data deletion capabilities for compliance
- Environment variable secrets management

## Testing Strategy

### Test Pyramid Implementation
**Decision**: Unit tests for providers, integration tests for pipeline, contract tests for APIs
**Rationale**:
- 80% coverage target focuses on business logic in agents/providers
- End-to-end tests validate complete pipeline with real APIs
- Contract tests ensure API compatibility across versions
- Mock implementations enable fast unit test execution

### Demo and Validation
**Decision**: Automated demo script with sample Meléndez Landscaping image
**Rationale**:
- Provides immediate validation of complete pipeline
- Sample data enables consistent testing across environments
- Dry-run mode prevents accidental external sends during development

## Monitoring and Observability

### Logging Strategy
**Decision**: Structured JSON logging with correlation IDs
**Rationale**:
- Each lead processing tracked through complete pipeline
- External API calls logged with response times and status
- Error aggregation enables pattern identification
- Performance metrics collection for optimization

### Metrics Collection
**Decision**: Custom metrics for business KPIs, system performance monitoring
**Rationale**:
- Lead conversion rates and scoring accuracy tracking
- API response time monitoring aligned with performance budgets
- Queue depth and processing time metrics for scaling decisions

## Implementation Priorities

### Vertical Slice Approach
1. **Core Pipeline**: Ingest → OCR → Score → Preview (no external sends)
2. **Enrichment Integration**: Add Google Maps and business data lookup
3. **Outreach Generation**: SMS/email content creation with dry-run testing
4. **Dashboard Interface**: Lead review and approval workflow
5. **Production Hardening**: Error handling, monitoring, security audit

This research confirms all technical decisions are well-founded and aligned with constitutional principles and specification requirements.