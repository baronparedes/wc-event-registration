# Implementation Plan

## Objective

Build a scalable React + Supabase event registration platform with:

- public registration flow with mandatory ID-first lookup
- dynamic per-event registration fields
- authenticated admin management module

## Core Invariant

ID lookup is required and always first in public registration. It cannot be disabled.

## Confirmed Decisions

- UI stack: Shadcn UI + Tailwind + Radix primitives
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Duplicate policy: configurable per event (block or allow update)
- Admin scope: global admin v1, future event-scoped support
- Export format v1: CSV
- Member import contract: RFID maps to member_id
- Member profile shape: nickname is first-class; role and category remain in metadata

## Progress Snapshot (2026-06-22)

Completed through Chunk 4:

- Chunk 0: app scaffold + route shell + theme baseline
- Chunk 1: core schema + import pipeline + local seed generator workflow
- Chunk 2: RLS policy matrix across all core tables
- Chunk 3: public event gate by slug, availability prechecks, ID-first lookup form, minimal profile reveal
- Chunk 4: dynamic fields from metadata + runtime validation + preview-only submit + architectural standardization

Chunk 4 implementation notes:

- 12 field types supported in rendering and validation (text, textarea, number, email, phone, date, datetime, select, radio, checkbox, multi_select, boolean)
- dynamic field metadata validated and fails closed with user-facing messaging
- all 5 step components split from monolithic file into separate, composable UI files
- `publicRegistration` lib module refactored from 900+ LOC into 6 focused modules with clear responsibility boundaries
- page-folder architecture applied: `src/pages/public/event-registration/` contains page orchestrator + `components/` subfolder for UI
- Copilot instructions extended with vertical slice delivery pattern (anatomy, completeness checklist, coupling rules, sizing heuristics)

Next active target: Chunk 5 (secure submit path, duplicate policy, persistence).

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

### Phase 4: Public Registration UX (Chunk 4 complete)

- load event by slug with open/active prechecks ✅
- enforce ID-first gate and minimal profile reveal ✅
- render dynamic fields from metadata ✅
- validate runtime schema ✅
- architectural standardization: page-folders, colocalized components, split lib modules, vertical slice delivery pattern ✅

Phase 4 done criteria:
- all 12 field types render and validate dynamically ✅
- metadata guards fail closed gracefully ✅
- component architecture supports future feature expansion ✅
- Copilot instructions enable vertical slice delivery ✅
- submit through secure backend path with idempotency

Phase 4 done criteria:

- Gate B is fully passed before public registration release
- ID-first lookup includes anti-enumeration safeguards and normalized response behavior
- lookup and submit endpoints enforce per-IP and per-identifier throttling
- runtime schema validation and idempotent submit behavior are verified under concurrency tests

### Phase 5: Admin Module

- protected admin routes
- event create/edit/archive
- field builder for all supported field types
- registrations list/detail and CSV export

Phase 5 done criteria:

- Gate C is fully passed before broad admin rollout
- admin actions (create, update, archive, registration edits) are captured in audit logs
- admin listings are paginated using agreed query standards
- large CSV exports are handled through asynchronous generation with status visibility

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

### Chunk 1

Database skeleton + users CSV import workflow.

### Chunk 2

RLS policy lab with role test matrix.

### Chunk 3

Public ID-first registration gate.

Status: Completed locally.

### Chunk 4

Dynamic fields and validation.

Status: Next active chunk.

### Chunk 5

Secure submit path and duplicate policy logic.

### Chunk 6

Admin core pages and protected access.

### Chunk 7

Admin registrations and CSV export.

### Chunk 8

Hardening and future feature hooks.
