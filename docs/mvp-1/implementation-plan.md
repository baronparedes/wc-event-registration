# Implementation Plan

## Objective

Build a scalable React + Supabase event registration platform with:

- public registration flow with mandatory ID-first lookup
- dynamic per-event registration fields
- authenticated admin management module

## Core Invariant

ID lookup is required and always first in public registration. It cannot be disabled.

## Confirmed Decisions

- UI stack: Shadcn UI + Tailwind + Base UI primitives
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Duplicate policy: configurable per event (block or allow update)
- Admin scope: global admin v1, future event-scoped support
- Export format v1: CSV
- Member import contract: RFID maps to member_id
- Member profile shape: nickname, role, and category are first-class fields
- **Hook organization**: Domain-scoped folders with operation separation (queries/mutations/state); shared utilities in /hooks/utils/; one-hook-per-file pattern; naming: `use<Entity>Query`, `use<Action><Entity>Mutation`, `use<Entity>State`

## Progress Snapshot (2026-06-28)

Completed through Chunk 11 and Phase 6 Day 1 hardening:

- Chunk 0: app scaffold + route shell + theme baseline
- Chunk 1: core schema + import pipeline + local seed generator workflow
- Chunk 2: RLS policy matrix across all core tables
- Chunk 3: public event gate by slug, availability prechecks, ID-first lookup form, minimal profile reveal
- Chunk 4: dynamic fields from metadata + runtime validation + preview-only submit + architectural standardization
- Chunk 5: Edge Function submit path + duplicate policy enforcement + idempotency + full persistence + end-to-end tested
- Chunk 6: QA test suite for duplicate policy, idempotency, and hardening scenarios (900+ LOC)
- Chunk 7: admin authentication + protected routes + login page + local admin seeding
- Chunk 8: event publishing workflow + status transitions + requirement enforcement
- Chunk 9: event field configuration CRUD + field builder + all 12 field types + status-based restrictions (NEW)
- Chunk 10: registrations list/detail, cancel/reactivate actions, CSV export, verified admin auth, and shared edge-function rate limiting
- Chunk 11: admin registrations hardening and operational polish (Gate C focus)
- Phase 6 Day 1: runtime safety + backend validation hardening (error boundary, route validation, login RHF migration, backend field validation)
- CI quality gate workflow added at `.github/workflows/ci.yml` (runs `npm run ci:gate` on PR and main)
- Test coverage baseline currently above stop-ship threshold (`coverage/coverage-summary.json`: statements 81.86%, branches 70.38%)

Next active target: close remaining Phase 6 Day 2-7 operational-readiness items and complete Gate D sign-off, then move to the tech debt backlog.

## Phase Plan

### Phase 1: Foundation and Security Baseline

- initialize app architecture and environment strategy
- establish auth boundaries and backend validation strategy
- add observability baseline

Phase 1 done criteria:

- environment promotion flow and secrets strategy documented for local, preview, staging, and production
- baseline observability implemented with structured logs, error tracking, and request correlation ids
- rollback approach defined for app releases and migrations
- backup policy defined and first restore rehearsal scheduled

### Phase 2: Data Model and SQL Contract

- create core tables: users, admins, events, event_fields, registrations, registration_answers
- add event behavior flags: duplicate_policy, require_id_lookup, registration_mode
- add constraints and indexes
- add helper functions for open checks and submit-or-update

Phase 2 done criteria:

- schema constraints and indexes are applied and validated against expected query patterns
- dynamic field schema versioning model is implemented for registration integrity over time
- registration update behavior preserves immutable history when duplicate policy allows updates
- migration process includes backward-compatible-first rollout steps

Users CSV import path:

- raw import staging table
- validation SQL (required columns, duplicate IDs, malformed emails)
- upsert validated rows into users table
- rejected rows saved to import_errors
- import jobs are idempotent and can be retried safely

### Phase 3: RLS and Security Controls

- enable RLS everywhere
- public read policies limited to active/open records
- public write via controlled backend function path
- admin CRUD/read policies with role checks
- rate limiting and audit logging controls

Phase 3 done criteria:

- Gate A is fully passed before any public-facing registration features are enabled
- RLS matrix tests pass for anonymous, authenticated non-admin, and admin actors
- direct public table writes are blocked and all public writes flow through approved backend functions
- privileged function allowlist and service-role boundaries are documented and enforced

### Phase 4: Public Registration UX (Chunk 4-5 complete)

- load event by slug with open/active prechecks ✅
- enforce ID-first gate and minimal profile reveal ✅
- render dynamic fields from metadata ✅
- validate runtime schema ✅
- architectural standardization: page-folders, colocalized components, split lib modules, vertical slice delivery pattern ✅
- submit through secure Edge Function with duplicate policy + idempotency ✅

Phase 4 done criteria:

- all 12 field types render and validate dynamically ✅
- metadata guards fail closed gracefully ✅
- component architecture supports future feature expansion ✅
- Copilot instructions enable vertical slice delivery ✅
- secure backend submit path with idempotency implemented and tested ✅
- end-to-end registration flow verified: ID lookup → form → submission → persistence ✅

Phase 4 completion verified on 2026-06-22:

- Member lookup: ID "1324250891" → profile display ✅
- Dynamic fields: 14 fields rendered with proper validation ✅
- Form submission: All fields filled → Edge Function called → success response with registration_id ✅

Phase 4 additional done criteria (pre-Phase 5):

- Gate B is fully passed before public registration release
- ID-first lookup includes anti-enumeration safeguards and normalized response behavior
- lookup and submit endpoints enforce per-IP and per-identifier throttling
- runtime schema validation and idempotent submit behavior are verified under concurrency tests

### Phase 5: Admin Module (Complete)

- ✅ admin authentication with role verification (Chunk 7)
- ✅ protected admin routes with RequireAdminAuth guard (Chunk 7)
- ✅ admin login page with email/password form (Chunk 7)
- ✅ event publish workflow with requirements enforcement (Chunk 8)
- ✅ event list, create, edit, archive (Chunk 8 - partial, completed in full context)
- ✅ field builder for all supported field types (Chunk 9)
- ✅ registrations list/detail and CSV export (Chunk 10)
- ✅ registration status actions: cancel + reactivate (Chunk 10)
- ✅ edge auth hardening: JWT verified through Supabase Auth (Chunk 10)
- ✅ shared edge rate limiting across admin and public write/read paths (Chunk 10)

Chunk 10 completion verified on 2026-06-24:

- Registrations list page and detail page fully functional with admin protection ✅
- Cancel and reactivate mutations functional end-to-end via Edge Functions ✅
- CSV export functional with human-readable headers and server-driven filename ✅
- Edge auth fixed by replacing manual JWT payload decode with validated auth.getUser(token) ✅
- Shared security helper expanded for centralized admin guard and public rate-limit guard ✅
- Rate limits active on member lookup, submit registration, cancel/reactivate, and export endpoints ✅
- Build passes, lint stable (existing warnings only, no new errors) ✅

Chunk 9 completion verified on 2026-06-23 evening:

- Fields page at `/admin/events/:id/fields` with full CRUD workflow ✅
- All 12 field types supported with dynamic validation rule sections ✅
- Event status restrictions: draft (all editable), published (label/help only), archived (locked) ✅
- Query invalidation on create/update/delete/reorder mutations ✅
- Components colocalized in page folder per architecture rules ✅
- Hooks organized in domain/operation-scoped structure ✅
- Build passes: 307 modules, 0 TypeScript errors, 208 KB gzipped ✅

Chunk 7 completion verified on 2026-06-23:

- Admin auth hooks: `useAdminAuthQuery`, `useAdminLoginMutation`, `useAdminLogoutMutation` ✅
- Route guard: `RequireAdminAuth` redirects unauthenticated users, shows loading state ✅
- Admin login page: form with error/success toasts, validates role via admins table ✅
- Auth persistence: AppProviders syncs session across tabs via Supabase auth listener ✅
- Local seeding: dev.local.sql includes admin account (local@admin.com / Supabase@123) ✅
- TypeScript strict, build passes ✅

Chunk 8 completion verified on 2026-06-23:

- Event publishing workflow: Draft → Published → Archived with proper status restrictions ✅
- Validation schemas: Two-schema approach (draft lenient, publish strict) ✅
- PublishRequirementsChecker: Real-time checklist visible in edit form showing progress (X/6) ✅
- PublishEventDialog: Requirements displayed at confirmation with disabled button if incomplete ✅
- React Hook Form integration: isDirty eliminates false "changed" flags, dirtyFields for precise tracking ✅
- PublishActionButton: Encapsulates button + dialog state, component self-manages (no parent state pollution) ✅
- Shared publishRequirements helper: Single source of truth for requirements (used by form and dialog) ✅
- Event restrictions: Published events show info banner + disabled fields; Archived show warning + disabled ✅
- SaveConfirmationDialog: Uses dirtyFields for accurate change tracking, shows friendly field names ✅
- usePublishEventMutation: Validates requirements before publish, returns user-friendly error listing missing fields ✅
- TypeScript strict, build passes with 256 modules, 688 KB gzipped ✅

### Infrastructure Snapshot: Hook Organization (Current)

Current hook architecture is domain-scoped with operation folders broadly adopted:

- `src/hooks/domain/events/`, `src/hooks/domain/event-fields/`, `src/hooks/domain/members/`, and `src/hooks/domain/registrations/` use `queries/` + `mutations/` (and `state/` where needed) with operation-level barrels.
- Shared cross-domain UI/form hooks are under `src/hooks/utils/`.
- Auth hooks are currently still flat under `src/hooks/domain/auth/` and are tracked in the tech debt backlog for operation-folder alignment.

Verification snapshot:

- Build and lint pass in current workspace.
- Test coverage artifact present and above baseline gate thresholds.

- RLS matrix tested for admin role ✅
- public write path secured through Edge Functions ✅
- service-role usage documented in Supabase grant policies ✅
- audit logging framework ready for admin actions ✅
- admin routes protected with session + role verification ✅

Phase 5 done criteria:

- Gate C is fully passed before broad admin rollout
- admin actions (create, update, archive, registration edits) are captured in audit logs
- admin listings are paginated using agreed query standards
- large CSV exports are handled through asynchronous generation with status visibility

Phase 5 closeout note:

- Current CSV export remains synchronous and suitable for current dataset size.
- Async export pipeline is tracked as a future scalability enhancement for larger volumes.

### Phase 6: Hardening and Extensibility

- CAPTCHA and abuse protection
- duplicate/race-condition protections
- future hooks: waitlist, approvals, attendance

Phase 6 done criteria:

- Gate D is passed before production launch decision
- incident runbook, monitoring alerts, and SLO dashboards are live
- load, stress, and peak traffic tests meet defined thresholds
- Gate E post-launch hardening plan is scheduled with owners and review cadence

## Production Readiness Gates

Use these gates as required pass criteria before moving between phases and before any production release.

### Gate A: Pre-Phase 3 (Before Public-Facing Build)

- environment promotion flow defined: local -> preview -> staging -> production
- rollback strategy documented with release tagging and migration rollback/forward policy
- automated backups enabled with restore test completed at least once
- secrets managed via environment manager, never committed
- baseline observability in place: structured logs, error tracking, request correlation id

### Gate B: Pre-Phase 4 (Before Public Registration UX)

- anti-enumeration controls implemented for ID-first lookup
- strict rate limits for lookup and submit endpoints (per IP and per identifier)
- abuse controls active before public launch (CAPTCHA or equivalent challenge)
- public responses normalized to avoid revealing member existence through status/timing
- security review completed for backend function path and service-role usage boundaries

### Gate C: Pre-Phase 5 (Before Admin Expansion)

- RLS policy matrix tested for anonymous, authenticated non-admin, and admin roles
- privileged operations limited to approved backend functions with explicit allowlist
- audit trail enabled for admin create/update/archive actions and registration edits
- idempotency and conflict behavior verified under concurrent writes

### Gate D: Pre-Production Launch

- SLOs defined and measured in staging (availability, p95 latency, error rate)
- load test completed for expected peak registration traffic with headroom target
- import and export stress tests completed for expected data volumes
- incident runbook published (on-call path, rollback steps, degraded mode behavior)
- monitoring alerts configured for auth failures, rate-limit spikes, and error budget burn

### Gate E: Post-Launch 30-Day Hardening

- weekly backup restore verification completed
- top 5 slow queries reviewed and optimized
- abuse and failed lookup patterns reviewed with tuning actions captured
- operational metrics reviewed against SLOs with follow-up backlog created

## Next Target: Tech Debt Backlog (After Production-Ready Checklist)

Planned immediately after the Production Readiness Gates are complete:

1. Hook architecture consistency (high)

- move auth hooks into operation-scoped folders to match project standard:
  - `src/hooks/domain/auth/queries/useAdminAuthQuery.ts`
  - `src/hooks/domain/auth/mutations/useAdminLoginMutation.ts`
  - `src/hooks/domain/auth/mutations/useAdminLogoutMutation.ts`
- add/update operation barrels for auth domain (`queries/index.ts`, `mutations/index.ts`, and root `index.ts` re-exports)

2. Import standardization (high)

- replace remaining relative imports with `@/` aliases in layout and shared components
- first known target: `src/components/layout/AppShell.tsx`

3. Runtime validation hardening for dynamic payloads (medium)

- add Zod validation for parsed answer payloads in registration detail query
- first known target: `src/hooks/domain/registrations/queries/useRegistrationDetailQuery.ts`

4. Remove unsafe casts at data boundaries (medium)

- replace unsafe `as` casts in production code with refined guards/Zod parsing
- first known targets:
  - `src/lib/domain/event-fields/transforms.ts`
  - `src/hooks/domain/members/mutations/useUpdateMemberMutation.ts`
  - `src/hooks/domain/registrations/queries/useRegistrationDetailQuery.ts`

5. Edge Function contract hardening (medium)

- add runtime response validation (Zod) for Edge Function success/error discriminators
- apply to registration and admin mutation/query hooks that consume function responses

6. React subscription cleanup (low)

- replace `watch()` subscriptions with `useWatch()` where render subscriptions are intended
- first known target: `src/hooks/utils/useSlugGeneration.ts`

7. Minor UX/logic cleanup (low)

- fix redundant scroll behavior ternary in registration page
- first known target: `src/pages/events/[slug]/register/index.tsx`

8. Optional barrel completeness for admin page-local components (low)

- add `index.ts` barrels where missing if imports expand/reuse increases:
  - `src/pages/admin/events/[id]/fields/components/`
  - `src/pages/admin/events/[id]/registrations/components/`

## Testing Infrastructure: Cucumber + Playwright Integration

Planned as a post-launch testing initiative to automate end-to-end acceptance tests using business-readable Gherkin feature files.

**Status**: Foundation ready (feature files complete in `docs/features/`). Implementation deferred until after Gate D + production stabilization.

**Rationale**: Current unit/integration tests cover critical paths. Cucumber + Playwright adds browser-level acceptance testing to:

- Validate features match business requirements (requirements → scenarios → test automation)
- Enable QA teams to write/execute tests without code knowledge
- Provide regression protection for future releases
- Document system behavior in business language (already done in `docs/features/`)

### Integration Plan

**Phase 1: Setup and Foundation** (1-2 weeks, post-launch stabilization)

1. **Install and configure**
   - `npm install --save-dev @cucumber/cucumber @playwright/test`
   - Create `features/` directory mapping to `docs/features/` (or reference directly)
   - Create `cucumber.js` config with Playwright step definitions
   - Add VS Code Gherkin extension for IDE support

2. **Framework structure**
   - Step definitions file: `features/step-definitions/common.steps.ts`
   - Hooks for setup/teardown (browser context, auth, cleanup)
   - Page Object Model (POM) for maintainability:
     - `features/pages/HomePage.ts`
     - `features/pages/LoginPage.ts`
     - `features/pages/EventRegistrationPage.ts`
     - `features/pages/AdminDashboard.ts`
   - Test utilities: login helper, element waits, assertion helpers

3. **First suite: Public Registration Happy Path**
   - Map `docs/features/1-public-registration/1.1-browse-events.feature` → test scenarios
   - Map `docs/features/1-public-registration/1.2-member-lookup.feature` → test scenarios
   - Map `docs/features/1-public-registration/1.3-register-with-fields.feature` → test scenarios
   - Execute against local/staging environment
   - Verify all scenarios pass before expanding scope

**Phase 2: Expand Coverage** (2-3 weeks)

4. **Admin workflow suite**
   - `docs/features/2-admin-authentication/` scenarios
   - `docs/features/3-admin-events/` scenarios (create, publish, archive)
   - `docs/features/5-admin-registrations/` scenarios (view, cancel, reactivate)

5. **Error handling and edge cases**
   - `docs/features/7-system-features/` scenarios (auth protection, availability, errors)
   - Validation failure scenarios
   - Rate limiting scenarios (may require test-only bypass)

6. **Performance and load**
   - Concurrent registration submissions
   - Large CSV exports
   - Pagination navigation (many pages)

**Phase 3: CI/CD Integration** (1 week)

7. **GitHub Actions workflow**
   - Add `.github/workflows/e2e-tests.yml` (separate from `ci.yml`)
   - Run Cucumber tests on: PR branches, pre-merge validation, nightly against staging
   - Report results: pass/fail count, failure screenshots, video recordings for failures
   - Badge/status in PR checks

8. **Environment management**
   - Secrets: staging admin email/password (read-only test account)
   - Browser options: headed mode for local, headless for CI
   - Parallel execution config (run multiple features concurrently on CI for speed)

9. **Artifact capture**
   - Screenshots on failure (stored in CI artifacts)
   - Video recordings of failed scenarios (Playwright built-in)
   - HTML report generation (Cucumber HTML reporter)

**Phase 4: Maintenance and Evolution** (ongoing)

10. **Keep features and tests in sync**
    - When Gherkin features change in `docs/features/`, update/add test scenarios
    - When code changes, run Cucumber suite in CI before merge
    - Quarterly feature review to ensure coverage remains comprehensive

11. **Extend with custom rules**
    - Step definitions for domain-specific actions: "I register with [field] set to [value]"
    - Reusable assertion steps: "I should see registration status [status]"
    - Data fixtures for test setup (pre-created events, members, etc.)

### Key Design Decisions

**Gherkin Feature Files as Source of Truth**

- Features exist in `docs/features/` (business-readable, already comprehensive)
- Cucumber steps implement these features using Playwright
- Any feature change updates both business doc and test code
- Minimal duplication: scenarios describe behavior once, tested by step code

**Page Object Model for Maintainability**

- Tests refer to pages and actions, not DOM selectors
- Selectors centralized in POM classes (easier to update if UI changes)
- Example: `await loginPage.enterEmail('admin@example.com')` (readable intent)
- Not: `await page.locator('input[type="email"]').fill('admin@example.com')` (brittle)

**Parallel Test Execution**

- Feature files run concurrently on CI to speed up feedback
- Each feature gets its own isolated browser context
- Test data prefixed with timestamp to prevent collisions
- Staging environment must support concurrent test workload

**Failure Handling and Debugging**

- Screenshots and videos captured automatically on failure
- Step logs include timing (helps identify slow steps)
- Playwright trace files available for post-mortem analysis
- Clear error messages indicate which step failed and why

**Test Account and Data**

- Dedicated test admin account (never use production credentials)
- Test event created fresh per run (timestamped slug: "test-event-20260628-143022")
- Test member IDs generated uniquely (avoid collisions)
- Cleanup: delete test data after scenario completion (or mark as test data for weekly purge)

### Implementation Blockers and Risks

**Risk 1: Flaky Tests from Timing Issues**

- **Mitigation**: Use explicit waits (not sleep), Playwright default timeouts (30s), retry strategy on CI
- **Testing**: Run tests multiple times locally to identify flakiness

**Risk 2: Test Environment Parity**

- **Mitigation**: Maintain staging with feature parity to production; re-seed test data daily
- **Alternative**: Run against local dev environment if staging is unstable

**Risk 3: Performance Impact of Tests on Staging**

- **Mitigation**: Run tests at off-peak hours; use dedicated test tenant if multi-tenant ready
- **Alternative**: Cap concurrent test runs to reasonable limit (e.g., 3 concurrent browsers)

**Risk 4: Maintenance Burden**

- **Mitigation**: Keep step definitions DRY; document common patterns; quarterly review for cleanup
- **Clear Ownership**: Assign QA/developer to maintain tests; budget time in sprint for test fixes

### Success Metrics

- **Coverage**: 100% of business-critical features (public registration, admin CRUD, error handling)
- **Reliability**: <1% flaky test failure rate (failures are real bugs, not timing issues)
- **Speed**: Full suite runs in <10 min on CI
- **Maintenance**: Test code reviewed alongside feature code; no "stale test" debt
- **Value**: Test failures catch bugs before production; regression protection enables confident releases

### Timeline and Effort Estimate

| Phase | Tasks                             | Duration   | Effort     | Dependencies                    |
| ----- | --------------------------------- | ---------- | ---------- | ------------------------------- |
| 1     | Setup + public registration suite | 1-2 weeks  | 1 engineer | Feature files done, post-launch |
| 2     | Admin + error scenarios           | 2-3 weeks  | 1 engineer | Phase 1 complete                |
| 3     | CI/CD integration + reports       | 1 week     | 1 engineer | Phase 2 complete                |
| 4     | Ongoing maintenance               | Per sprint | 10-20%     | All phases complete             |

**Total: 4-6 weeks (spread over 2-3 months post-launch)**

### Future Enhancements

- **Visual Regression Testing**: Screenshot comparison with Playwright (detect unintended UI changes)
- **Performance Benchmarking**: Measure registration submit time, CSV export time trends
- **Accessibility Testing**: WCAG compliance checks embedded in Cucumber steps
- **Mobile Testing**: Run same scenarios on mobile viewports (Playwright supports multi-device)
- **Mock Data Generators**: Faker.js for realistic test data (members, field responses, etc.)

---

## Scalability and Security Architecture Addendum

### Data and Schema Evolution

- dynamic fields are versioned; each registration stores field schema version at submit time
- registration_answers keeps immutable submitted payload snapshot for audit/debug parity
- duplicate policy "allow update" writes a new versioned change record and actor metadata
- migration contract includes backward-compatible changes first, destructive changes later

### Write Path and Authorization Model

- all public writes go through controlled backend function endpoints; no direct table writes
- service-role credentials are isolated to backend runtime only
- backend endpoints enforce explicit authorization and input validation before DB calls
- RLS remains deny-by-default, with narrowly scoped read policies for public surfaces

### Throughput and Async Processing

- CSV imports run as asynchronous jobs with chunked processing and retry policy
- failed import chunks are routed to a dead-letter table with reason and retry metadata
- CSV export for large datasets uses asynchronous generation with signed download links
- long-running jobs publish status for admin visibility (queued, running, failed, completed)

### Query and Storage Strategy

- pagination standards: cursor-based for registrations and admin listings
- index standards include event_id + created_at, event_id + member_id, and lookup identifiers
- hot-path queries have explicit budget targets and are reviewed via slow query logs
- archive policy defined for aged registrations and audit events to control table growth

### Abuse and Privacy Controls

- layered rate limits at edge plus backend function level
- lookup lockout policy for repeated failed attempts per IP and identifier window
- minimal profile reveal policy enforced (only fields needed for confirmation)
- PII retention and deletion/anonymization workflow documented and tested

### Reliability and Operations

- target SLOs tracked continuously:
  - availability >= 99.9%
  - p95 public submit latency <= 700ms under normal load
  - server error rate < 1%
- release strategy uses staged rollouts with fast rollback trigger conditions
- incident response includes severity classification, communication templates, and postmortems
- dashboard minimums: request volume, error rates, latency percentiles, queue depth, job failures

### Multi-Tenant and Future Scope Path

- keep current global admin model, but model permissions via scopes (global, event) now
- add permission abstraction in backend checks to avoid hard-coding global-only assumptions
- ensure event ownership metadata exists to support event-scoped admin without table rewrites
- document migration path from global admin to scoped admin roles before v2 begins

## Chunked Learning Delivery

### Chunk 0

Supabase foundations, app scaffold, route shell, theme baseline.

Status: Completed.

### Chunk 1

Database skeleton + users CSV import workflow.

Status: Completed.

### Chunk 2

RLS policy lab with role test matrix.

Status: Completed.

### Chunk 3

Public ID-first registration gate.

Status: Completed.

### Chunk 4

Dynamic fields and validation.

Status: Completed.

### Chunk 5

Secure submit path and duplicate policy logic.

Status: Completed. 900+ LOC of integration tests, constraint tests, and utilities. All scenarios covered:

- Block policy: first succeeds, duplicate rejected ✅
- Allow_update policy: duplicate updates existing ✅
- Idempotency: same key returns same result ✅
- Concurrency: simultaneous submissions both persist ✅
- Race conditions: winner-take-all on block policy ✅
- Validation: missing fields, invalid IDs, oversized payloads ✅
- Abuse patterns: SQL injection and XSS detection ✅

### Chunk 6

QA test suite for duplicate policy, idempotency, and hardening scenarios.

Status: Completed.

### Chunk 7

Admin core pages and protected access.

Status: Completed.

### Chunk 8

Event publishing workflow with requirements enforcement.

Status: Completed.

- Two-schema validation (draft lenient, publish strict) ✅
- PublishRequirementsChecker showing real-time progress ✅
- PublishEventDialog at confirmation with requirement enforcement ✅
- Event status workflow (Draft → Published → Archived) with restrictions ✅
- React Hook Form integration for accurate change detection ✅
- Component self-managed state (PublishActionButton) ✅
- Shared publishRequirements helper to prevent duplication ✅

### Chunk 9

Event field configuration (CRUD for all field types).

Status: Completed.

### Chunk 10

Registrations list/detail with CSV export.

Status: Completed.

### Chunk 11

Admin registrations hardening and operational polish (Gate C focus).

Status: Completed.

### Phase 6 Production Hardening (Gate D Focus)

**Day 1 Completion (2026-06-24): Runtime Safety & Backend Validation ✅**

All 8 critical Day 1 tasks completed:

1. **Global Error Boundary** ✅
   - Created ErrorBoundary.tsx class component
   - Catches render exceptions, prevents blank screen crashes
   - Logs with request correlation IDs
   - Wrapped AppRouter in src/App.tsx
   - Effort: 30 min

2. **Form Effects Race Condition Fix** ✅
   - Consolidated 3 overlapping useEffect hooks into 2 synchronized effects
   - Fixed validation errors disappearing during form transitions
   - Added explicit dependency tracking and state guards
   - Effort: 1 hour

3. **Route Param Validation** ✅
   - Created 404 NotFoundPage component
   - Replaced catch-all silent redirect with explicit 404 UI
   - Added loading spinner to RequireAdminAuth guard
   - Prevents undefined state rendering on bad bookmarks
   - Effort: 1 hour

4. **Admin Login RHF Migration** ✅
   - Refactored from useState to React Hook Form + Zod
   - Applied consistent error toast pattern
   - Now aligns with project RHF mandate
   - Effort: 1 hour

5. **Auth Guard Pre-Flight Check** ✅
   - Enhanced RequireAdminAuth with animated loading state
   - Validates session token before rendering protected content
   - Prevents flash of protected content on session expiry
   - Effort: 30 min

6. **Error Detail Scrubbing** ✅
   - Removed error_detail leakage from all Edge Functions
   - Replaced detailed messages with generic "Failed to process registration" responses
   - Added error codes for client debugging (EVENT_LOOKUP_FAILED, USER_LOOKUP_FAILED, etc.)
   - Detailed errors still logged server-side
   - Effort: 1 hour

7. **Backend Field Validation Schema** ✅
   - Added comprehensive validateFieldValue() function to submit-registration
   - Validates all 12 field types with constraints:
     - Text: min_length, max_length, pattern
     - Email/Phone: format validation
     - Numbers: min/max
     - Selects: option whitelist
     - Multi-select: count constraints
     - Date/DateTime: format and range
     - Boolean: type coercion
   - Returns field-level validation errors (400 status)
   - Prevents invalid data persistence
   - Effort: 2 hours

8. **Build & Format Verification** ✅
   - `npm run build`: 596ms, 0 TypeScript errors
   - `npm run format:check`: All files compliant
   - No new lint errors
   - Effort: 30 min

**Day 1 Summary**:

- **Product Quality**: 6.5 → 8.0 (+1.5 points)
- **Security**: 6.0 → 8.0 (+2 points)
- **Go-Live Confidence**: 6/10 → 7.5/10

**Remaining Work (Days 2-7)**:

Days 2-4: Backend Hardening

- ✅ Idempotency race condition hardening implemented via insert-first + unique-conflict recovery path
- Normalize typed answer storage strategy + update CSV reader
- Expand integration tests for additional failure-path scenarios (coverage baseline already above threshold)

Days 4-5: Operational Readiness

- ✅ ALLOWED_ORIGINS production env var validation
- ✅ CI quality gate workflow (lint/build/test/format via `npm run ci:gate`)
- Sentry integration + structured logging
- Backup/restore rehearsal + runbook

Day 6-7: Verification & Release Gate

- Full smoke test: public registration + admin CRUD + CSV export
- Integration + unit test execution
- Load sanity test (50 reg/min for 10 min)
- Stop-ship gate verification

Status: In progress (critical runtime hardening done; operational readiness and launch rehearsal remain).

## Production Readiness Audit (2026-06-24)

**Snapshot Baseline: 6.5/10 product quality, 4.5/10 operations readiness**

This section captures critical launch findings and required mitigations before production release. Review this alongside Gate D/E criteria before go-live decision.

### Current Status Update (2026-06-27)

Implemented since the original audit snapshot:

- Global error boundary is active in app shell.
- Registration form race-condition effect cleanup shipped.
- Route parameter validation and explicit not-found route handling shipped.
- Admin login migrated to React Hook Form + Zod.
- Submit-registration field-level backend validation shipped for all supported field types.
- Edge Function client error detail scrubbing shipped.
- Idempotency conflict recovery hardened in submit-registration.
- CI quality gate workflow is active in GitHub Actions.
- Coverage artifact indicates critical-path baseline is above threshold.

Still open before production launch decision:

- Sentry/error monitoring integration.
- Backup restore rehearsal + documented rollback drill.
- Final smoke/load rehearsal and Gate D checklist sign-off.

### Critical Launch Risks (Historical Audit Baseline; resolved items marked)

#### 1. No Global Error Boundary (CRITICAL - App Crash Risk)

- **Status**: Fixed on 2026-06-24.

- **Location**: [src/App.tsx](src/App.tsx)
- **Issue**: Any rendering exception in EventRegistrationPage, dynamic forms, or nested components crashes entire app to blank screen.
- **Impact**: At scale, one render bug in any page component breaks service for all users.
- **Fix**: Add ErrorBoundary component wrapping AppRouter; log errors to Sentry with request ID.
- **Effort**: 30 min

#### 2. Race Condition in Event Registration Form (HIGH - UX Data Loss)

- **Status**: Fixed on 2026-06-24.

- **Location**: [src/pages/events/[slug]/register/index.tsx](src/pages/events/[slug]/register/index.tsx#L133)
- **Issue**: Three overlapping useEffect hooks can fire in unpredictable order during gate transitions/member lookup:
  - Line 133: `clearErrors()` when `responseSchema` changes
  - Line 143: Prefill form when `activeFields` or `prefillResponses` change
  - Line 147: Reset form when `isDynamicFieldGateReady` closes
- **Impact**: Users report "validation errors disappeared," "form won't submit," or stale field values under concurrent actions.
- **Fix**: Consolidate into 1-2 synchronized effects with explicit dependency tracking and state guards.
- **Effort**: 2 hours

#### 3. Missing Route Parameter Validation (HIGH - Bad UX, Silent Failures)

- **Status**: Fixed on 2026-06-24.

- **Locations**:
  - [src/pages/events/[slug]/register/index.tsx](src/pages/events/[slug]/register/index.tsx#L43)
  - [src/pages/admin/events/[id]/registrations/[registration_id]/index.tsx](src/pages/admin/events/[id]/registrations/[registration_id]/index.tsx)
- **Issue**: Dynamic route params (`slug`, `id`, `registration_id`) not validated before use; catch-all redirect to `/` masks bad bookmarks instead of showing 404.
- **Impact**: Bad links show undefined states; pages attempt to render with missing params causing downstream errors.
- **Fix**: Add validation in queries (e.g., return 404 when slug not found); show explicit error UI for invalid params.
- **Effort**: 1 hour

#### 4. Backend Validation Depth Too Shallow (CRITICAL - Data Corruption Risk)

- **Status**: Fixed on 2026-06-24.

- **Location**: [supabase/functions/submit-registration/index.ts](supabase/functions/submit-registration/index.ts#L94)
- **Issue**: Only validates required fields exist; does NOT enforce per-field constraints (min_length, max_length, pattern, date range, required status, type coercion).
- **Impact**: Invalid data stored in database; CSV export breaks; admin reports unreliable.
- **Fix**: Validate against Zod schema for each field type before insert; return field-level errors to user.
- **Effort**: 3 hours (build validation schema library for use in Edge Function)

#### 5. Error Detail Leakage to Clients (HIGH - Information Disclosure)

- **Status**: Fixed on 2026-06-24.

- **Locations**:
  - [supabase/functions/submit-registration/index.ts](supabase/functions/submit-registration/index.ts#L138)
  - [supabase/functions/cancel-registration/index.ts](supabase/functions/cancel-registration/index.ts) (also present)
  - [supabase/functions/export-registrations-csv/index.ts](supabase/functions/export-registrations-csv/index.ts) (also present)
- **Issue**: Edge Functions return `error_detail: errorMessage` containing raw database errors to clients (e.g., "column 'users.member_id' does not exist").
- **Impact**: Attacker can enumerate schema and identify injection vectors.
- **Fix**: Scrub error responses; return generic "internal error" to client; log full details server-side with request ID for support correlation.
- **Effort**: 1 hour (all functions)

#### 6. Answer Persistence Type Strategy Inconsistent (MEDIUM - Data Integrity Risk)

- **Status**: Open.

- **Location**: [supabase/functions/submit-registration/index.ts](supabase/functions/submit-registration/index.ts#L350) vs schema definition
- **Issue**: Schema supports typed columns (answer_text, answer_number, answer_boolean, answer_date, answer_json) but submit-registration writes mostly answer_text with JSON stringification. CSV export must infer/decode types.
- **Impact**: Inconsistent round-trip; export formatting logic is fragile; future features (reporting, filtering) will struggle with type ambiguity.
- **Fix**: Choose explicit typed storage strategy: either (a) always use answer_text with runtime type hints in metadata, OR (b) write to correct typed column by field_type. Update CSV export reader accordingly.
- **Effort**: 2-3 hours (includes migration if needed)

#### 7. Idempotency Race Condition (HIGH - Duplicate Registration Risk)

- **Status**: Fixed on 2026-06-24 via insert-first + unique-conflict recovery.

- **Location**: [supabase/functions/submit-registration/index.ts](supabase/functions/submit-registration/index.ts#L272)
- **Issue**: Unique constraint on (event_id, idempotency_key) is not transaction-wrapped. Two simultaneous requests with same idempotency_key can both create registrations before uniqueness check fires.
- **Impact**: Duplicate registrations for same user on same event; cancel/reactivate affect wrong record; audit trail corrupted.
- **Fix**: Wrap idempotency check + insert in explicit transaction (BEGIN SERIALIZABLE or move logic to Edge Function with polling retry).
- **Effort**: 2 hours

#### 8. ALLOWED_ORIGINS Localhost Default in Production (HIGH - CORS Bypass Risk)

- **Location**: [supabase/functions/\_shared/security.ts](supabase/functions/_shared/security.ts#L3)
- **Status**: Fixed on 2026-06-24.
- **Resolution**: Removed localhost fallback, require explicit ALLOWED_ORIGINS, fail closed on empty or invalid allowlists, and reject localhost-style origins when `SUPABASE_ENV=production`.

#### 9. Rate Limiting In-Memory Per-Instance (MEDIUM - Multi-Instance Enforcement Gap)

- **Status**: Open (accepted for week-1 scope).

- **Location**: [supabase/functions/\_shared/security.ts](supabase/functions/_shared/security.ts#L60) (enforceInMemoryRateLimit)
- **Issue**: Fixed-window limiter is per-instance, not globally distributed. Does not enforce limits across multiple Vercel instances/cold starts.
- **Impact**: Rate limits will not work correctly in multi-instance deployments; concurrent scaling bypasses throttling.
- **Scope limitation documented**: OK for week-1 launch if documented and understood; mark as post-launch optimization.
- **Fix**: Defer to Redis-backed limiter post-launch OR accept single-instance assumption for week 1 with clear abuse-response runbook.
- **Effort**: Deferred; document risk acceptance in launch notes.

### Architectural Drift from Standards (Historical; current status below)

#### 1. AdminLoginPage Violates RHF Mandate

- **Status**: Fixed.

- **Location**: [src/pages/admin/login/index.tsx](src/pages/admin/login/index.tsx#L14)
- **Issue**: Uses `useState(email)` / `useState(password)` instead of React Hook Form + Zod.
- **Expected**: All forms use `useForm` + `zodResolver` per Copilot instructions.
- **Fix**: Refactor to RHF pattern; apply zodResolver with admin email/password schema.
- **Effort**: 1 hour

#### 2. Auth Guard Post-Mount Validation (MEDIUM - Security/UX Issue)

- **Status**: Fixed.

- **Location**: [src/app/router.tsx](src/app/router.tsx#L15)
- **Issue**: RequireAdminAuth only checks `isAuthenticated` after component mounts; if session expires mid-page, protected content renders briefly before redirect.
- **Impact**: Sensitive pages (event edit, registrations) briefly visible before access denied; security event.
- **Fix**: Add pre-flight auth check or use loading skeleton before render.
- **Effort**: 1 hour

#### 3. Admin Login Toast Pattern Inconsistency

- **Status**: Partially open (RHF migration completed; toast handling can still be normalized).

- **Location**: [src/pages/admin/login/index.tsx](src/pages/admin/login/index.tsx#L27)
- **Issue**: Manual catch + re-toast vs automatic mutation error handling in other mutations.
- **Fix**: Standardize error message handling across all mutations using single toast pattern.
- **Effort**: 30 min

### Test Coverage Gaps

- **Current baseline**: Coverage artifact is above threshold (statements 81.86%, branches 70.38%).
- **Current test inventory**: 60+ test files across pages, hooks, lib, and integration flows.
- **Remaining gap**: Expand integration and failure-path scenarios (rate-limit 429, schema mismatch, and edge-case mutation failures).
- **Integration execution blocker**: `npm run test:integration` currently requires `SUPABASE_SERVICE_ROLE_KEY` in the environment.
- **Recommendation**: Keep raising failure-path depth and ensure integration env secrets are configured in CI/staging.

### Operations Gaps

#### CI Quality Gate In Place; Deployment Automation Pending

- **Status**: Partially complete.
- **Current**: GitHub Actions quality workflow runs `npm run ci:gate` on PR and main.
- **Remaining**: Add release/deploy workflow (staging + production promotion strategy) and branch protection rollout.

#### No Production Error Monitoring

- **Issue**: Zero structured logging or error tracking; exceptions go unseen.
- **Fix**: Wire Sentry for frontend + Edge Function errors; add correlation IDs for request tracing.
- **Effort**: 1-2 hours

#### No Backup/Restore Rehearsal

- **Issue**: No documented RTO/RPO or tested restore process.
- **Fix**: Enable Supabase automated backups; test restore in staging; document runbook.
- **Effort**: 2 hours

#### No Incident Runbook

- **Issue**: No escalation paths, on-call rotation, or rollback procedures.
- **Fix**: Document: auth failure response, rate-limit spike response, 500 spike response, rollback procedure, and escalation contacts.
- **Effort**: 2 hours

### Phase 6 Check Status (Quick View)

- Days 1-2 Runtime Safety and Frontend Fixes: Complete
- Days 2-4 Backend Hardening: In progress
  - Completed: idempotency race-condition hardening
  - Open: typed answer storage plus CSV alignment
  - Open: additional failure-path expansion
- Days 4-5 Operational Readiness: In progress
  - Completed: ALLOWED_ORIGINS production guard
  - Completed: CI quality gate workflow
  - Open: Sentry and correlation IDs
  - Open: backup restore rehearsal and rollback runbook
- Days 6-7 Verification and Release Gate: In progress
  - Open: full smoke test
  - Open: load sanity test
  - Open: final Gate D sign-off

#### Completed So Far (Phase 6)

Days 1-2 completed:

1. Global error boundary implemented and wired in app shell.
2. Registration form race-condition effect cleanup completed.
3. Route parameter validation and explicit not-found handling added.
4. Admin login migrated to React Hook Form plus Zod.
5. Auth guard pre-flight behavior hardened to avoid protected-content flash.
6. Edge Function error-detail scrubbing completed.
7. Backend field-level validation completed for all supported field types.
8. Build and format checks passing.

Days 2-4 completed:

1. Idempotency race-condition hardening implemented via insert-first and unique-conflict recovery.
2. Coverage baseline verified above threshold (statements 81.86%, branches 70.38%).

Days 4-5 completed:

1. ALLOWED_ORIGINS production validation and fail-closed behavior implemented.
2. CI quality gate workflow active (`npm run ci:gate` on PR and main).

### Strict 7-Day Critical Path (2026-06-28 to 2026-07-04)

Objective: close remaining production-readiness blockers and complete Gate D launch decision with explicit ownership and hard exits.

Owners used below:

- FE: Frontend owner
- BE: Edge Function and DB owner
- OPS: environment, runbook, and release owner
- QA: verification owner

#### Day 1 (2026-06-28): Typed Answer Storage Decision + Contract Lock

1. Decide and document canonical answer storage shape for submissions and exports.

- Owner: BE
- Dependencies: none
- Exit: documented contract added in this plan and mirrored in export expectations

2. Implement submit/export alignment to the chosen contract.

- Owner: BE
- Dependencies: task 1
- Exit: build passes and CSV output matches expected typed values

#### Day 2 (2026-06-29): Failure-Path Test Expansion

1. Add/expand integration and unit failure-path tests (429, schema mismatch, edge mutation errors).

- Owner: QA (with FE/BE support)
- Dependencies: Day 1 contract lock
- Exit: new failure-path tests committed; no regression to current coverage baseline

2. Resolve integration env secret setup for test execution.

- Owner: OPS
- Dependencies: none
- Exit: integration tests runnable with required environment variables in agreed execution target

#### Day 3 (2026-06-30): Monitoring and Correlation

1. Integrate Sentry for frontend and Edge Function error capture.

- Owner: FE + BE
- Dependencies: none
- Exit: verified test event visible in monitoring for both surfaces

2. Standardize correlation IDs in user-safe error logs and runbook examples.

- Owner: BE + OPS
- Dependencies: task 1
- Exit: documented trace path from client incident to backend log entry

#### Day 4 (2026-07-01): Backup + Rollback Readiness

1. Complete backup restore rehearsal in staging.

- Owner: OPS
- Dependencies: staging backup availability
- Exit: restore evidence captured with elapsed time and outcome

2. Publish rollback drill steps for app + migrations.

- Owner: OPS
- Dependencies: task 1
- Exit: runbook updated and reviewed

#### Day 5 (2026-07-02): End-to-End Smoke Gate

1. Run full smoke suite: public registration, admin CRUD, cancel/reactivate, CSV export.

- Owner: QA
- Dependencies: Days 1-4 complete
- Exit: pass/fail checklist attached to session handoff with defects triaged

#### Day 6 (2026-07-03): Load Sanity + SLO Check

1. Execute load sanity test (50 registrations/min for 10 min).

- Owner: QA + OPS
- Dependencies: Day 5 pass
- Exit: latency/error snapshot recorded; no stop-ship threshold breach

2. Compare results against Gate D criteria.

- Owner: OPS
- Dependencies: task 1
- Exit: explicit Gate D readiness recommendation drafted

#### Day 7 (2026-07-04): Launch Decision

1. Gate D sign-off review.

- Owner: FE + BE + OPS + QA
- Dependencies: Days 1-6 evidence complete
- Exit: one of two outcomes only
  - Launch approved: soft-launch 10% cohort
  - Launch blocked: blocker list with owner/date commitments

### Current Blockers (as of 2026-06-28)

1. Typed answer storage and CSV reader alignment not yet completed.
2. Sentry + correlation-ID monitoring not yet integrated.
3. Backup restore rehearsal and rollback drill not yet evidenced.
4. Full smoke + load rehearsal still pending.
5. Integration environment key availability still required in target execution context.

### Stop-Ship Criteria (Do Not Launch If Any Are True)

- [x] Error boundary not in place ✅ DONE
- [x] Backend validation still allows invalid field values ✅ DONE
- [x] Any Edge Function returns error_detail to clients ✅ DONE
- [x] AdminLoginPage not using RHF ✅ DONE
- [x] ALLOWED_ORIGINS still defaults to localhost in production config ✅ DONE
- [x] No CI gate for lint/build/tests ✅ DONE (`.github/workflows/ci.yml`)
- [ ] No rollback rehearsal completed (TODO)
- [x] Test suite < 50% coverage for critical paths ✅ DONE (current statements 81.86%, branches 70.38%)
- [ ] No error monitoring configured (TODO)

### Risk Acceptance & Deferrals

**Acceptable for Week 1:**

- In-memory rate limiting per-instance (document and monitor for abuse)
- Synchronous CSV export (current dataset size supports it)
- Basic monitoring only (SLO dashboards deferred)

**Deferred Post-Launch Backlog:**

- Distributed rate limiting (Redis-backed)
- Async CSV export pipeline
- Event-scoped admin roles (currently global only)
- CAPTCHA/abuse controls beyond rate limiting
- Waitlist and approval workflows
- Attendance tracking

### Launch Recommendation

Verdict: staging progression remains valid only if the strict 7-day critical path exits are met in sequence.

Go-live policy: soft launch 10% cohort first, expand to 100% only after 24-hour stable telemetry and no stop-ship events.
