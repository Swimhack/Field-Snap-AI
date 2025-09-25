
# Implementation Plan: Field Snap AI MVP - Lead Generation from Photos

**Branch**: `001-build-field-snap` | **Date**: 2025-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:\Users\james\Desktop\RANDOM\AI\FieldSnapAI\specs\001-build-field-snap\spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Field Snap AI MVP transforms photos of local business advertisements into qualified outbound leads through automated OCR processing, web enrichment, intelligent scoring, and outreach generation. The system processes business photos within 2 minutes to produce structured lead data, generate preview websites, and create ready-to-send SMS/email content. Built with TypeScript, Bun runtime, and Supabase infrastructure for production-ready scalability.

## Technical Context
**Language/Version**: TypeScript 5.3+, Bun 1.0+ runtime
**Primary Dependencies**: Supabase (PostgreSQL + Storage), Google Cloud Vision API, OpenAI Vision API, Netlify, Twilio, Nodemailer, Zod validation
**Storage**: Supabase PostgreSQL with file storage buckets (leads-raw, leads-ocr, leads-thumbs)
**Testing**: Bun test framework, end-to-end testing, contract testing
**Target Platform**: Node.js/Bun server environment, mobile-first web interface
**Project Type**: web - frontend dashboard + backend API pipeline
**Performance Goals**: API responses <200ms p95, OCR processing <3s, lead scoring <500ms, full pipeline <2min
**Constraints**: National US coverage, 1-year data retention, queue-based API rate limiting, single admin authentication
**Scale/Scope**: Production MVP for lead generation, comprehensive logging, automated outreach pipeline

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety First**:
- [x] All types defined (no `any` without justification) - Zod schemas for all entities and API boundaries
- [x] Zod schemas for all API boundaries - Required for OCR, enrichment, scoring, and outreach data
- [x] TypeScript strict mode enabled - Enforced via tsconfig.json

**Test-Driven Development**:
- [x] Test files created before implementation - Contract tests for all endpoints, unit tests for providers
- [x] 80% coverage target planned - Focus on business logic in agents and providers
- [x] Red-Green-Refactor cycle documented - Required for all new features

**Mobile-First Architecture**:
- [x] Mobile viewport prioritized - Dashboard interface optimized for mobile field representatives
- [x] Touch interactions considered - Large touch targets for approve/send actions
- [x] Offline capability assessed - Queue mechanism handles intermittent connectivity

**Security by Design**:
- [x] Input validation planned - Zod validation at all API boundaries, OCR confidence thresholds
- [x] Authentication/authorization defined - Single bearer token authentication for all access
- [x] Secrets management via env vars - All API keys stored in environment variables

**Performance Optimization**:
- [x] Performance budgets defined (API <200ms, processing <3s) - Explicit requirements in spec
- [x] Caching strategy outlined - Queue-based processing prevents API rate limit violations
- [x] Code splitting planned for frontend - Lightweight dashboard with progressive enhancement

## Project Structure

### Documentation (this feature)
```
specs/001-build-field-snap/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure (frontend dashboard + backend API)
/infra
  supabase.sql           # Database schema and seed data
  env.example            # Environment variables template
/functions
  ingest.ts              # HTTP: receive image, create lead, enqueue job
  logs.ts                # API endpoint for log access
/src
  /core
    types.ts             # Zod schemas and TypeScript types
    normalize.ts         # Normalize phones, colors, services, addresses
    score.ts             # Scoring rules and rationale
    offers.ts            # Service offer recommendations
  /providers
    ocr.ts               # OCR interface with Google Vision/OpenAI
    enrich.ts            # Business enrichment via Google/Yelp APIs
    storage.ts           # Supabase storage helpers
    db.ts                # Supabase client and queries
    netlify.ts           # Preview site deployment
    twilio.ts            # SMS sending
    gmail.ts             # Email sending
  /agents
    extract.ts           # LLM structuring of OCR output
    enrichment.ts        # Data consolidation and deduplication
    scoring.ts           # Lead scoring with rationale
    webdev.ts            # Preview site generation
    outreach.ts          # SMS/email content generation
  /workers
    queue.ts             # Job queue management
    processLead.ts       # End-to-end pipeline orchestrator
  /api
    server.ts            # Express/Fastify server setup
    routes.ts            # API route definitions
  /ui
    dashboard.tsx        # React dashboard for lead management
/scripts
  demo-run.ts            # Demo script with sample data
  seed.ts                # Database seeding
/tests
  contract/              # API contract tests
  integration/           # End-to-end tests
  unit/                  # Unit tests for providers/agents
```

**Structure Decision**: Option 2 (Web application) - Dashboard frontend + API backend pipeline

## Phase 0: Outline & Research ✅ COMPLETED
1. **Extract unknowns from Technical Context** above:
   - ✅ No NEEDS CLARIFICATION items identified - all technologies well-defined
   - ✅ All dependencies researched and validated
   - ✅ Integration patterns documented

2. **Generate and dispatch research agents**:
   - ✅ Technology stack decisions validated
   - ✅ Architecture patterns confirmed
   - ✅ Performance strategies documented

3. **Consolidate findings** in `research.md`:
   - ✅ Decisions documented with rationale
   - ✅ Alternatives considered and evaluated
   - ✅ Implementation priorities defined

**Output**: ✅ `research.md` completed with comprehensive technical decisions

## Phase 1: Design & Contracts ✅ COMPLETED
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - ✅ 4 core entities defined: Lead, Lead Enrichment, Lead Scoring, Outreach
   - ✅ Validation rules and constraints documented
   - ✅ Relationships and indexes specified

2. **Generate API contracts** from functional requirements:
   - ✅ Ingest API contract (POST /api/ingest)
   - ✅ Leads API contract (GET /api/leads, replay functionality)
   - ✅ Logs API contract (monitoring and health checks)
   - ✅ OpenAPI 3.0.3 schemas with full validation

3. **Generate contract tests** from contracts:
   - ✅ Test scenarios documented in quickstart.md
   - ✅ Expected request/response schemas defined
   - ✅ Error handling patterns specified

4. **Extract test scenarios** from user stories:
   - ✅ 3 primary scenarios: happy path, low confidence, established business
   - ✅ End-to-end validation procedures documented
   - ✅ Performance and error handling tests specified

5. **Update agent file incrementally**:
   - ✅ Executed `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`
   - ✅ Technology stack added to CLAUDE.md
   - ✅ Project context updated for development efficiency

**Output**: ✅ `data-model.md`, `contracts/`, `quickstart.md`, `CLAUDE.md` all completed

## Phase 2: Task Planning Approach ✅ PLANNED
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- ✅ Load `.specify/templates/tasks-template.md` as base structure
- ✅ Generate tasks from Phase 1 design docs:
  - 3 API contracts → 3 contract test tasks [P]
  - 4 entities → 4 model creation tasks [P]
  - 3 user stories → 3 integration test scenarios [P]
  - Core providers (OCR, enrichment, scoring, outreach) → implementation tasks
  - Dashboard interface → frontend development tasks
  - Infrastructure setup → deployment and monitoring tasks

**Ordering Strategy**:
- ✅ TDD order: Contract/unit tests before implementation
- ✅ Dependency order: Core types → Providers → Agents → API → Dashboard
- ✅ Parallel execution: Different files marked [P]
- ✅ Constitutional compliance: Type safety, mobile-first, security validation

**Estimated Output**: 45-55 numbered tasks across 7 phases:
1. Setup & Configuration (5 tasks)
2. Core Types & Schemas (5 tasks)
3. Provider Implementation (15 tasks) [P]
4. Agent Logic (10 tasks)
5. API Endpoints (8 tasks)
6. Dashboard Interface (7 tasks)
7. Testing & Deployment (8 tasks)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - `research.md` created
- [x] Phase 1: Design complete (/plan command) - `data-model.md`, `contracts/`, `quickstart.md`, `CLAUDE.md` created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - Strategy documented, ready for `/tasks`
- [ ] Phase 3: Tasks generated (/tasks command) - Will create `tasks.md`
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All constitutional requirements validated
- [x] Post-Design Constitution Check: PASS - Design aligns with all principles
- [x] All NEEDS CLARIFICATION resolved - Comprehensive clarifications in spec
- [x] Complexity deviations documented - No violations, all requirements justified

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
