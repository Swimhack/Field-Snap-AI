# Tasks: Field Snap AI MVP - Lead Processing Pipeline

**Input**: Existing codebase structure and requirements from README.md
**Tech Stack**: TypeScript, Bun, Supabase, Google Vision API, OpenAI Vision API, Zod

## Execution Flow Summary
Based on the existing codebase, this MVP implementation requires:
- Setting up environment and dependencies
- Writing comprehensive tests for all providers
- Implementing server and API endpoints
- Creating integration tests
- Adding monitoring and documentation

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup & Configuration

- [ ] T001 Verify project structure matches architecture (src/, functions/, tests/)
- [ ] T002 Create infra/env.example with all required environment variables
- [ ] T003 [P] Set up ESLint configuration in .eslintrc.json
- [ ] T004 [P] Configure TypeScript strict mode in tsconfig.json
- [ ] T005 [P] Create .gitignore for Bun and TypeScript project

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Provider Tests
- [ ] T006 [P] Create test for OCR provider in tests/unit/providers/ocr.test.ts
- [ ] T007 [P] Create test for database provider in tests/unit/providers/db.test.ts
- [ ] T008 [P] Create test for storage provider in tests/unit/providers/storage.test.ts
- [ ] T009 [P] Create test for enrichment provider in tests/unit/providers/enrich.test.ts
- [ ] T010 [P] Create test for scoring provider in tests/unit/providers/scoring.test.ts
- [ ] T011 [P] Create test for notifications provider in tests/unit/providers/notifications.test.ts
- [ ] T012 [P] Create test for websearch provider in tests/unit/providers/websearch.test.ts

### API Contract Tests
- [ ] T013 [P] Contract test POST /api/ingest in tests/contract/ingest.test.ts
- [ ] T014 [P] Contract test GET /api/logs in tests/contract/logs.test.ts
- [ ] T015 [P] Contract test GET /api/health/db in tests/contract/health-db.test.ts
- [ ] T016 [P] Contract test GET /api/health/ocr in tests/contract/health-ocr.test.ts
- [ ] T017 [P] Contract test GET /api/health/notifications in tests/contract/health-notifications.test.ts

### Integration Tests
- [ ] T018 [P] Integration test for complete lead processing pipeline in tests/integration/pipeline.test.ts
- [ ] T019 [P] Integration test for OCR fallback mechanism in tests/integration/ocr-fallback.test.ts
- [ ] T020 [P] Integration test for lead scoring thresholds in tests/integration/scoring.test.ts
- [ ] T021 [P] Integration test for notification delivery in tests/integration/notifications.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Setup
- [ ] T022 Create infra/supabase.sql with complete database schema
- [ ] T023 Implement database connection in src/providers/db.ts with connection pooling

### Core Providers
- [ ] T024 [P] Implement OCR factory pattern in src/providers/ocr.ts with Google Vision and OpenAI fallback
- [ ] T025 [P] Implement file storage operations in src/providers/storage.ts using Supabase Storage
- [ ] T026 [P] Implement business enrichment in src/providers/enrich.ts with Google Places and Yelp APIs
- [ ] T027 [P] Implement lead scoring logic in src/providers/scoring.ts with configurable thresholds
- [ ] T028 [P] Implement multi-channel notifications in src/providers/notifications.ts (email, SMS, push)
- [ ] T029 [P] Implement web search capabilities in src/providers/websearch.ts
- [ ] T030 [P] Implement application logger in src/utils/logger.ts with structured logging

### Type Definitions
- [ ] T031 Define all Zod schemas in src/core/types.ts for runtime validation
- [ ] T032 Add TypeScript interfaces for all API responses

### API Endpoints
- [ ] T033 Implement main ingest endpoint in functions/ingest.ts with error handling
- [ ] T034 Implement logs API endpoint in functions/logs.ts with filtering support
- [ ] T035 Create server.ts with Express/Hono setup and middleware

## Phase 3.4: Integration & Infrastructure

- [ ] T036 Set up environment variable validation on startup
- [ ] T037 Implement rate limiting middleware for all endpoints
- [ ] T038 Add CORS configuration for API endpoints
- [ ] T039 Implement request/response logging middleware
- [ ] T040 Add authentication middleware for protected endpoints
- [ ] T041 Create health check endpoints for all external services
- [ ] T042 Implement graceful shutdown handling

## Phase 3.5: Frontend & UI

- [ ] T043 [P] Create public/index.html with mobile-first responsive design
- [ ] T044 [P] Create public/css/styles.css with modern CSS and dark mode support
- [ ] T045 [P] Create public/js/app.js for image upload and API interaction
- [ ] T046 [P] Implement PWA manifest in public/manifest.json
- [ ] T047 [P] Add service worker in public/sw.js for offline support

## Phase 3.6: Monitoring & Observability

- [ ] T048 [P] Implement performance metrics collection
- [ ] T049 [P] Add error tracking with stack traces
- [ ] T050 [P] Create dashboard endpoint for system metrics
- [ ] T051 Set up alerting thresholds for critical errors

## Phase 3.7: Documentation & Polish

- [ ] T052 [P] Create API documentation in docs/api.md with OpenAPI spec
- [ ] T053 [P] Write deployment guide in docs/deployment.md
- [ ] T054 [P] Create troubleshooting guide in docs/troubleshooting.md
- [ ] T055 [P] Add inline code documentation with JSDoc comments
- [ ] T056 Performance optimization - ensure API responses < 200ms p95
- [ ] T057 Security audit - validate all input sanitization
- [ ] T058 Run quickstart validation from README.md

## Dependencies

### Critical Dependencies
- **Setup (T001-T005)** → Everything else
- **Tests (T006-T021)** → Implementation (T022-T035)
- **Database (T022-T023)** → All provider implementations
- **Type definitions (T031-T032)** → API endpoints (T033-T035)
- **Server setup (T035)** → Integration tasks (T036-T042)
- **All implementation** → Polish and documentation (T052-T058)

### Provider Dependencies
- T023 (database) blocks T024-T030 (providers)
- T031 (types) blocks T033-T034 (endpoints)
- T035 (server) blocks T036-T042 (middleware)

## Parallel Execution Examples

### Launch all provider tests together (T006-T012):
```bash
# Using Task agents in parallel
Task: "Create test for OCR provider in tests/unit/providers/ocr.test.ts"
Task: "Create test for database provider in tests/unit/providers/db.test.ts"
Task: "Create test for storage provider in tests/unit/providers/storage.test.ts"
Task: "Create test for enrichment provider in tests/unit/providers/enrich.test.ts"
Task: "Create test for scoring provider in tests/unit/providers/scoring.test.ts"
Task: "Create test for notifications provider in tests/unit/providers/notifications.test.ts"
Task: "Create test for websearch provider in tests/unit/providers/websearch.test.ts"
```

### Launch all contract tests together (T013-T017):
```bash
Task: "Contract test POST /api/ingest in tests/contract/ingest.test.ts"
Task: "Contract test GET /api/logs in tests/contract/logs.test.ts"
Task: "Contract test GET /api/health/db in tests/contract/health-db.test.ts"
Task: "Contract test GET /api/health/ocr in tests/contract/health-ocr.test.ts"
Task: "Contract test GET /api/health/notifications in tests/contract/health-notifications.test.ts"
```

### Launch provider implementations together (T024-T030):
```bash
Task: "Implement OCR factory pattern in src/providers/ocr.ts"
Task: "Implement file storage operations in src/providers/storage.ts"
Task: "Implement business enrichment in src/providers/enrich.ts"
Task: "Implement lead scoring logic in src/providers/scoring.ts"
Task: "Implement multi-channel notifications in src/providers/notifications.ts"
Task: "Implement web search capabilities in src/providers/websearch.ts"
Task: "Implement application logger in src/utils/logger.ts"
```

## Validation Checklist

- ✅ All providers have corresponding unit tests
- ✅ All API endpoints have contract tests
- ✅ All tests come before implementation (TDD)
- ✅ Parallel tasks work on different files
- ✅ Each task specifies exact file path
- ✅ No parallel tasks modify the same file
- ✅ Dependencies clearly defined
- ✅ Performance requirements included (< 200ms API responses)
- ✅ Security requirements included (input validation)

## Notes

- **[P] tasks** = Different files, no shared dependencies
- **Commit after each task** for granular history
- **Run tests** after each implementation task to verify
- **Performance budget**: API < 200ms, OCR < 3s, Scoring < 500ms
- **Coverage target**: Minimum 80% for business logic
- **Mobile-first**: All UI tasks prioritize mobile viewport

## Next Steps After Task Completion

1. Run full test suite: `bun test`
2. Verify type safety: `bun run type-check`
3. Check linting: `bun run lint`
4. Test quickstart flow from README.md
5. Deploy to staging environment
6. Run performance benchmarks
7. Security audit with OWASP checklist

---
*Generated from Field Snap AI codebase analysis*
*Constitution v1.0.0 compliance verified*