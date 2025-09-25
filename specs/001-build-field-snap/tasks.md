# Tasks: Field Snap AI MVP - Lead Generation from Photos

**Input**: Design documents from `C:\Users\james\Desktop\RANDOM\AI\FieldSnapAI\specs\001-build-field-snap\`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extracted: TypeScript 5.3+, Bun 1.0+, Supabase, Google Vision, OpenAI, Netlify
2. Load optional design documents:
   ✓ data-model.md: 4 entities (Lead, Lead Enrichment, Lead Scoring, Outreach)
   ✓ contracts/: 3 API contracts (ingest, leads, logs)
   ✓ research.md: Technical decisions and architecture patterns
   ✓ quickstart.md: 3 test scenarios and validation procedures
3. Generate tasks by category: Setup, Tests, Core, Integration, Polish
4. Apply task rules: TDD order, parallel marking, dependency management
5. Number tasks sequentially (T001-T064)
6. Generate dependency graph and parallel execution examples
7. Validate task completeness: All contracts tested, entities modeled, endpoints implemented
8. Return: SUCCESS (64 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Web application structure** (from plan.md):
- **Infrastructure**: `/infra/` for database and environment setup
- **Functions**: `/functions/` for HTTP endpoints
- **Core Logic**: `/src/core/`, `/src/providers/`, `/src/agents/`, `/src/workers/`
- **API Layer**: `/src/api/` for server and routes
- **Frontend**: `/src/ui/` for dashboard
- **Scripts**: `/scripts/` for demo and seeding
- **Tests**: `/tests/` for contract, integration, and unit tests

## Phase 3.1: Project Setup

- [ ] T001 Create project directory structure per implementation plan
- [ ] T002 Initialize TypeScript project with Bun runtime and dependencies (package.json, tsconfig.json)
- [ ] T003 [P] Configure ESLint and Prettier with TypeScript strict mode rules
- [ ] T004 [P] Create environment configuration in infra/env.example with all required API keys
- [ ] T005 Create Supabase database schema in infra/supabase.sql with all entities and indexes

## Phase 3.2: Core Types & Schemas (Foundation)

- [ ] T006 [P] Define Lead entity schema with Zod validation in src/core/types.ts
- [ ] T007 [P] Define Lead Enrichment schema with Zod validation in src/core/types.ts
- [ ] T008 [P] Define Lead Scoring schema with Zod validation in src/core/types.ts
- [ ] T009 [P] Define Outreach schema with Zod validation in src/core/types.ts
- [ ] T010 [P] Create normalization utilities in src/core/normalize.ts (phone, address, colors)
- [ ] T011 [P] Define scoring rules and rationale logic in src/core/score.ts
- [ ] T012 [P] Create service offer recommendation engine in src/core/offers.ts

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [ ] T013 [P] Contract test POST /api/ingest in tests/contract/ingest-api.test.ts
- [ ] T014 [P] Contract test GET /api/leads/{id} in tests/contract/leads-api.test.ts
- [ ] T015 [P] Contract test POST /api/leads/{id}/replay in tests/contract/leads-replay.test.ts
- [ ] T016 [P] Contract test GET /api/logs in tests/contract/logs-api.test.ts
- [ ] T017 [P] Contract test GET /api/health/* endpoints in tests/contract/health-api.test.ts

### Provider Tests (External Services)
- [ ] T018 [P] Unit test OCR provider interface in tests/unit/providers/ocr.test.ts
- [ ] T019 [P] Unit test database provider in tests/unit/providers/db.test.ts
- [ ] T020 [P] Unit test storage provider in tests/unit/providers/storage.test.ts
- [ ] T021 [P] Unit test enrichment provider in tests/unit/providers/enrich.test.ts
- [ ] T022 [P] Unit test scoring provider in tests/unit/providers/scoring.test.ts
- [ ] T023 [P] Unit test notifications provider in tests/unit/providers/notifications.test.ts
- [ ] T024 [P] Unit test Netlify provider in tests/unit/providers/netlify.test.ts

### Integration Tests (End-to-End Scenarios)
- [ ] T025 [P] Integration test landscaping truck scenario in tests/integration/happy-path.test.ts
- [ ] T026 [P] Integration test blurry image scenario in tests/integration/low-confidence.test.ts
- [ ] T027 [P] Integration test established business scenario in tests/integration/existing-website.test.ts

## Phase 3.4: Provider Implementation (ONLY after tests are failing)

### Database and Storage
- [ ] T028 [P] Implement Supabase database client in src/providers/db.ts
- [ ] T029 [P] Implement Supabase storage operations in src/providers/storage.ts

### OCR and Processing
- [ ] T030 [P] Implement OCR provider interface with Google Vision primary in src/providers/ocr.ts
- [ ] T031 [P] Add OpenAI Vision fallback to OCR provider in src/providers/ocr.ts

### External APIs
- [ ] T032 [P] Implement business enrichment provider in src/providers/enrich.ts (Google Maps, Yelp)
- [ ] T033 [P] Implement Netlify deployment provider in src/providers/netlify.ts
- [ ] T034 [P] Implement Twilio SMS provider in src/providers/twilio.ts
- [ ] T035 [P] Implement Gmail email provider in src/providers/gmail.ts

## Phase 3.5: Agent Logic (Business Intelligence)

- [ ] T036 Extract agent: LLM structuring of OCR output in src/agents/extract.ts
- [ ] T037 Enrichment agent: Data consolidation and deduplication in src/agents/enrichment.ts
- [ ] T038 Scoring agent: Lead scoring with rationale in src/agents/scoring.ts
- [ ] T039 Web development agent: Preview site generation in src/agents/webdev.ts
- [ ] T040 Outreach agent: SMS/email content creation in src/agents/outreach.ts

## Phase 3.6: Queue and Orchestration

- [ ] T041 Implement job queue management in src/workers/queue.ts
- [ ] T042 Implement end-to-end pipeline orchestrator in src/workers/processLead.ts

## Phase 3.7: API Endpoints

- [ ] T043 Create Express/Fastify server setup in src/api/server.ts
- [ ] T044 Implement POST /api/ingest endpoint in src/api/routes.ts
- [ ] T045 Implement GET /api/leads/{id} endpoint in src/api/routes.ts
- [ ] T046 Implement POST /api/leads/{id}/replay endpoint in src/api/routes.ts
- [ ] T047 Implement GET /api/logs endpoint in src/api/routes.ts
- [ ] T048 Implement health check endpoints in src/api/routes.ts
- [ ] T049 Add authentication middleware for bearer token validation in src/api/server.ts
- [ ] T050 Add rate limiting and CORS middleware in src/api/server.ts

## Phase 3.8: HTTP Functions

- [ ] T051 [P] Implement main ingest HTTP function in functions/ingest.ts
- [ ] T052 [P] Implement logs HTTP function in functions/logs.ts

## Phase 3.9: Dashboard Interface

- [ ] T053 [P] Create React dashboard component in src/ui/dashboard.tsx
- [ ] T054 [P] Implement lead list view with filtering in src/ui/dashboard.tsx
- [ ] T055 [P] Add lead detail view with approval workflow in src/ui/dashboard.tsx
- [ ] T056 [P] Create mobile-responsive CSS with touch-friendly interactions

## Phase 3.10: Scripts and Utilities

- [ ] T057 [P] Create demo script with sample data in scripts/demo-run.ts
- [ ] T058 [P] Create database seeding script in scripts/seed.ts
- [ ] T059 [P] Add application logger with structured output in src/utils/logger.ts

## Phase 3.11: Testing and Validation

- [ ] T060 [P] Run quickstart validation scenarios from quickstart.md
- [ ] T061 [P] Performance testing to validate <200ms API response budget
- [ ] T062 [P] End-to-end pipeline testing with 2-minute completion target
- [ ] T063 [P] Security testing: authentication, input validation, error handling

## Phase 3.12: Documentation and Polish

- [ ] T064 [P] Update README.md with setup instructions and API documentation

## Dependencies

### Critical Path Dependencies
- **Setup (T001-T005)** → Everything else
- **Core Types (T006-T012)** → All implementation tasks
- **Tests (T013-T027)** → Implementation (T028-T063)
- **Providers (T028-T035)** → Agents (T036-T040)
- **Agents (T036-T040)** → Orchestration (T041-T042)
- **Orchestration (T041-T042)** → API Endpoints (T043-T050)
- **API (T043-T050)** → Functions (T051-T052)
- **All Core** → Dashboard (T053-T056)

### Provider Dependencies
- T028 (database) blocks T036-T042 (agents need DB access)
- T029 (storage) blocks T036, T039 (extract and webdev agents)
- T030-T031 (OCR) blocks T036 (extract agent)
- T032 (enrichment) blocks T037 (enrichment agent)
- T033 (Netlify) blocks T039 (webdev agent)
- T034-T035 (communications) blocks T040 (outreach agent)

### File Conflict Dependencies
- T006-T009 (same file: src/core/types.ts) must be sequential
- T044-T048 (same file: src/api/routes.ts) must be sequential
- T053-T055 (same file: src/ui/dashboard.tsx) must be sequential

## Parallel Execution Examples

### Launch all contract tests together (T013-T017):
```bash
Task: "Contract test POST /api/ingest in tests/contract/ingest-api.test.ts"
Task: "Contract test GET /api/leads/{id} in tests/contract/leads-api.test.ts"
Task: "Contract test POST /api/leads/{id}/replay in tests/contract/leads-replay.test.ts"
Task: "Contract test GET /api/logs in tests/contract/logs-api.test.ts"
Task: "Contract test GET /api/health/* endpoints in tests/contract/health-api.test.ts"
```

### Launch all provider tests together (T018-T024):
```bash
Task: "Unit test OCR provider interface in tests/unit/providers/ocr.test.ts"
Task: "Unit test database provider in tests/unit/providers/db.test.ts"
Task: "Unit test storage provider in tests/unit/providers/storage.test.ts"
Task: "Unit test enrichment provider in tests/unit/providers/enrich.test.ts"
Task: "Unit test scoring provider in tests/unit/providers/scoring.test.ts"
Task: "Unit test notifications provider in tests/unit/providers/notifications.test.ts"
Task: "Unit test Netlify provider in tests/unit/providers/netlify.test.ts"
```

### Launch all integration tests together (T025-T027):
```bash
Task: "Integration test landscaping truck scenario in tests/integration/happy-path.test.ts"
Task: "Integration test blurry image scenario in tests/integration/low-confidence.test.ts"
Task: "Integration test established business scenario in tests/integration/existing-website.test.ts"
```

### Launch provider implementations after tests pass (T028-T035):
```bash
Task: "Implement Supabase database client in src/providers/db.ts"
Task: "Implement Supabase storage operations in src/providers/storage.ts"
Task: "Implement OCR provider interface with Google Vision primary in src/providers/ocr.ts"
Task: "Implement business enrichment provider in src/providers/enrich.ts"
Task: "Implement Netlify deployment provider in src/providers/netlify.ts"
Task: "Implement Twilio SMS provider in src/providers/twilio.ts"
Task: "Implement Gmail email provider in src/providers/gmail.ts"
```

## Validation Checklist

### Task Completeness
- ✅ All 3 API contracts have corresponding contract tests (T013-T017)
- ✅ All 4 entities have schema definitions (T006-T009)
- ✅ All 7 providers have unit tests and implementations (T018-T024, T028-T035)
- ✅ All 3 quickstart scenarios have integration tests (T025-T027)
- ✅ Complete pipeline from ingestion to outreach covered
- ✅ Mobile-first dashboard implementation included
- ✅ Performance and security validation tasks included

### Constitutional Compliance
- ✅ **Type Safety First**: Zod schemas for all entities (T006-T009)
- ✅ **Test-Driven Development**: All tests before implementation (T013-T027 before T028+)
- ✅ **Mobile-First Architecture**: Dashboard responsive design (T056)
- ✅ **Security by Design**: Authentication middleware (T049), input validation
- ✅ **Performance Optimization**: Performance testing (T061), response time validation

### Dependency Validation
- ✅ Parallel tasks work on different files with no shared dependencies
- ✅ Sequential tasks clearly identified for same-file modifications
- ✅ TDD order maintained: tests written before implementations
- ✅ Provider dependencies correctly sequenced
- ✅ Critical path identified and documented

## Notes

- **[P] tasks** = Different files, can run in parallel, no shared dependencies
- **Sequential tasks** = Same file modifications, must run in order
- **Verify tests fail** before implementing to ensure TDD compliance
- **Commit after each task** for granular change tracking
- **Performance targets**: API <200ms, OCR <3s, pipeline <2min
- **Constitutional compliance** embedded throughout task structure

## Success Criteria

After completing all 64 tasks:
1. ✅ Complete Field Snap AI MVP ready for production deployment
2. ✅ All quickstart scenarios pass validation testing
3. ✅ Performance budgets met (API <200ms, pipeline <2min)
4. ✅ Mobile-first dashboard fully functional
5. ✅ Complete test coverage with TDD methodology
6. ✅ All constitutional principles satisfied
7. ✅ Production-ready infrastructure and monitoring

---
*Generated from Field Snap AI design documents*
*Constitution v1.0.0 compliant*
*Ready for immediate execution*