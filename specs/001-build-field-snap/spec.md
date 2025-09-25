# Feature Specification: Field Snap AI MVP - Lead Generation from Photos

**Feature Branch**: `001-build-field-snap`
**Created**: 2025-01-23
**Status**: Draft
**Input**: User description: "Build Field Snap AI MVP (lead-gen from photos)"

## Execution Flow (main)
```
1. Parse user description from Input
   � Parsed: Complete lead generation system from business photos
2. Extract key concepts from description
   � Actors: Business owners, sales teams, field representatives
   � Actions: Photo capture, OCR processing, data enrichment, lead scoring, outreach generation
   � Data: Business ads, lead records, enrichment data, outreach content
   � Constraints: 2-minute processing time, production-ready quality
3. For each unclear aspect:
   � All major aspects clearly defined in requirements
4. Fill User Scenarios & Testing section
   � Primary flow: Photo � Lead � Outreach defined
5. Generate Functional Requirements
   � 25 testable requirements covering full pipeline
6. Identify Key Entities (if data involved)
   � 4 core entities: Lead, Enrichment, Scoring, Outreach
7. Run Review Checklist
   � All requirements testable and unambiguous
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

## Clarifications

### Session 2025-01-23
- Q: What level of access control should the Field Snap AI dashboard and API have? → A: Single admin access - one bearer token for all operations
- Q: What geographic boundaries should the system use for lead qualification? → A: National coverage - entire United States
- Q: What data retention period should the system enforce for compliance and storage management? → A: 1 year - annual business cycle retention
- Q: What rate limiting strategy should the system use for external API calls? → A: Queue-based processing - serialize all API calls to avoid limits
- Q: How should the system handle different priority leads in terms of processing urgency? → A: Equal processing - all leads processed in submission order

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A field representative takes a photo of a local business advertisement (truck wrap, storefront sign, yard sign) using their mobile device. The system automatically processes this photo to extract business information, enriches it with web data, scores the lead quality, generates a professional website preview, and creates ready-to-send outreach materials. Within 2 minutes, the representative has a qualified lead with personalized SMS and email content, allowing them to immediately engage with the business owner about relevant services.

### Acceptance Scenarios
1. **Given** a photo of a landscaping truck wrap with business name and phone number, **When** the user uploads the image via the mobile interface, **Then** the system extracts "Mel�ndez Landscaping" and "(555) 123-4567", enriches with Google Maps data, scores as high priority (8/10), and generates a website preview with tree service recommendations
2. **Given** a blurry storefront photo with low OCR confidence, **When** the processing completes, **Then** the lead is marked as "needs review" and appears in the dashboard for manual verification before outreach
3. **Given** a business photo where no website is found during enrichment, **When** lead scoring occurs, **Then** the system adds +3 points and recommends "Website creation and Google Business Profile setup" as primary offers
4. **Given** a processed lead in the dashboard, **When** the user clicks "Approve & Send" with ALLOW_SEND=true, **Then** SMS and email are dispatched via configured providers and delivery status is logged
5. **Given** an existing lead with the same normalized phone number and city, **When** a new photo is processed, **Then** the system updates enrichment data without creating a duplicate lead

### Edge Cases
- What happens when OCR fails to extract any readable text from the image?
- What occurs when external APIs (Google Maps, Yelp) are temporarily unavailable?
- How does the system respond when Netlify deployment fails during preview generation?
- What happens when a business has no online presence at all (no website, no listings)?

## Requirements *(mandatory)*

### Functional Requirements

#### Image Processing & OCR
- **FR-001**: System MUST accept image uploads via URL or direct file upload through HTTP API
- **FR-002**: System MUST extract text from business advertisements using OCR technology with confidence scoring
- **FR-003**: System MUST parse extracted text to identify business name, phone number, email, website, services, and visual elements
- **FR-004**: System MUST normalize phone numbers to standard format and validate them
- **FR-005**: System MUST store raw OCR output with bounding box coordinates for manual review when confidence is below 60%

#### Data Enrichment
- **FR-006**: System MUST search for business information using phone number and business name
- **FR-007**: System MUST collect website URL, business listing information, review counts, ratings, and social media profiles
- **FR-008**: System MUST store enrichment data with source attribution and timestamps
- **FR-009**: System MUST handle cases where no online presence is found for a business
- **FR-010**: System MUST deduplicate leads based on normalized phone number and city

#### Lead Scoring & Recommendations
- **FR-011**: System MUST calculate lead scores from 0-10 based on defined criteria (website presence, review quality, service types, location within United States)
- **FR-012**: System MUST generate rationale text explaining why each score was assigned
- **FR-013**: System MUST classify leads into priority bands: high (8+), medium (5-7.9), low (<5)
- **FR-014**: System MUST recommend specific service offers based on scoring criteria (website creation, redesign, reputation management, local SEO)
- **FR-015**: System MUST process all leads in submission order regardless of priority classification

#### Preview Generation
- **FR-016**: System MUST generate static preview websites showcasing the business with extracted information
- **FR-017**: System MUST deploy preview sites to web hosting with unique URLs
- **FR-018**: System MUST use extracted color schemes in preview designs with professional fallbacks
- **FR-019**: System MUST include clickable phone and email contact methods in previews

#### Outreach Generation
- **FR-020**: System MUST generate SMS messages under 300 characters with local, respectful tone
- **FR-021**: System MUST generate email content under 120 words with service recommendations
- **FR-022**: System MUST include opt-out mechanisms in all SMS communications
- **FR-023**: System MUST respect ALLOW_SEND configuration flag for actual message delivery

#### Administrative & Monitoring
- **FR-024**: System MUST provide dashboard interface for reviewing leads, scores, and approving outreach
- **FR-025**: System MUST support "replay pipeline" functionality to reprocess existing leads with updated data
- **FR-026**: System MUST complete full processing pipeline within 2 minutes for valid inputs
- **FR-027**: System MUST log all processing steps and external API calls for audit purposes
- **FR-028**: System MUST maintain processing status and error information for troubleshooting
- **FR-029**: System MUST authenticate all API and dashboard access using a single bearer token with full administrative privileges
- **FR-030**: System MUST automatically delete lead data, images, and generated content after 1 year retention period
- **FR-031**: System MUST use queue-based processing to serialize external API calls and prevent rate limit violations

### Key Entities *(include if feature involves data)*
- **Lead**: Primary business record containing extracted information (name, contact details, services, location), OCR confidence, processing status, and visual elements from the source image
- **Lead Enrichment**: Supplementary data collected from external sources including website analysis, business listings, social media profiles, reviews, and data source attribution with timestamps
- **Lead Scoring**: Calculated assessment containing numerical score, detailed rationale, priority classification, and recommended service offers based on business characteristics
- **Outreach**: Generated communication content including SMS and email messages, preview website URL, delivery status, and provider response tracking

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---