# Data Security Overview (Implementation-Based)

Last updated: 2026-08-12

## Purpose

This document explains how data is currently protected in the WC Event Registration platform, based on the implementation in this repository. It is intended for business users, admins, and stakeholders who want clear visibility into how data access is controlled and where additional hardening is recommended.

## Data Categories We Protect

- Member and Public Attendee profile data: names, contact details, member ID, and optional profile metadata.
- Registration data: event registrations, responses, status, and timestamps.
- Attendance data: check-ins, assignment fields, attendance answers, and saved attendance views.
- Admin operations data: audit logs for selected admin actions.

## Security Model Summary

The platform uses a layered model:

1. Identity and session controls via Supabase Auth.
2. Role-based authorization for admin features.
3. Row Level Security (RLS) on database tables.
4. Backend write paths through Supabase Edge Functions.
5. Request validation, origin controls, and rate limiting in shared Edge Function middleware.

## Implemented Security Controls

### 1. Authentication and role checks

- Admin-protected Edge Functions require a valid bearer token and resolve the caller using Supabase Auth.
- The shared admin guard verifies the caller has an admin record and that the role is allowed for the operation.
- Write operations are limited to trusted admin roles by default (`admin`, `super_admin`) unless a function explicitly allows a wider role set.

Operational effect:

- Unauthenticated requests to admin operations are denied.
- Authenticated users without an eligible admin role are denied.

### 2. Database Row Level Security (RLS)

- RLS is enabled on core public tables (users, admins, events, event_fields, registrations, answers, import tables) and attendance/public-registration tables.
- Role helper functions are used inside policies to centralize authorization decisions.
- Read and write capabilities are separated by role in policy definitions.

Operational effect:

- Direct table access through the API is scoped by policy, not only by frontend behavior.
- Sensitive tables are not readable/writable by anonymous clients.

### 3. Public API posture: direct anonymous table access revoked

- Anonymous direct `select/insert/update` access to public registration tables has been revoked.
- Anonymous direct read access to events and event fields has been revoked.
- Public read/write flows now rely on Edge Functions using the service role client, with explicit request handling logic.

Operational effect:

- Public clients do not receive direct SQL-style table access for these domains.
- Public access is mediated through backend handlers.

### 4. Edge Function request hardening

- Shared middleware enforces:
  - strict CORS allowlist handling,
  - method checks,
  - structured request validation (Zod),
  - generic deny responses for blocked origins,
  - rate limiting with HTTP 429 and retry metadata.
- Public and admin endpoints both have rate-limit presets for high-risk actions (lookup, submit, export, cancel/reactivate).

Operational effect:

- Reduces accidental exposure from malformed requests and high-volume request bursts.
- Enforces consistent baseline security behavior across functions.

### 5. Validation and integrity checks

- Request payloads are validated at function boundaries.
- Database constraints enforce critical integrity rules (required values, enum checks, uniqueness, date ordering).
- Idempotency keys and uniqueness constraints reduce duplicate write risk.

Operational effect:

- Invalid payloads are rejected early.
- Data consistency is preserved even under retries or race conditions.

### 6. Audit logging for admin actions

- Selected admin operations (for example cancel/reactivate flows) write audit entries.
- Audit writes are non-blocking to avoid blocking successful business operations if logging fails.

Operational effect:

- Supports traceability of sensitive admin actions.

## Current Gaps and Risks to Address

The following items are implementation gaps, prioritized for remediation.

### High priority

1. Public event detail endpoint can return unpublished event data.

- Observation:
  - The public event detail function resolves events by slug without enforcing `status = 'published'` in the function query itself.
- Risk:
  - If a draft or archived slug is known, metadata and event details may be exposed.

2. Public event-fields endpoint does not enforce event publication state.

- Observation:
  - The endpoint fetches fields by `event_id` and active status, without validating that the parent event is published.
- Risk:
  - Form schema for non-public events may be exposed if an internal `event_id` is discovered.

3. Registration submission endpoints do not enforce event availability windows server-side.

- Observation:
  - Public/member submit handlers resolve event by slug and process registration logic, but do not enforce server-side checks for:
    - `status = 'published'`
    - registration mode open/closed
    - registration open/close time window
- Risk:
  - A direct API caller can potentially submit when UI gates would otherwise block.

4. Scheduled email export function is unauthenticated and lacks a function-level secret check.

- Observation:
  - The cron function is configured with `verify_jwt = false` and does not validate an internal secret token.
- Risk:
  - Endpoint can be invoked by external callers, increasing abuse and cost risk (email trigger workload).

### Medium priority

1. Some public endpoints rely on CORS allowlist as a traffic gate.

- Observation:
  - Origin checks are enforced, but `Origin` headers can be spoofed by non-browser clients.
- Risk:
  - CORS should not be treated as strong authentication for abuse prevention.

2. In-memory rate limiting is per runtime instance.

- Observation:
  - Rate-limit buckets are maintained in-memory in each function runtime.
- Risk:
  - Limits may be bypassed in multi-instance scenarios or after cold starts.

3. Public avatar bucket is configured as public.

- Observation:
  - `member_avatars` is a public bucket (with file type and size limits).
- Risk:
  - Object URLs are publicly retrievable if discovered.
  - This may be acceptable by policy, but should be explicitly approved and documented.

## Recommended Remediation Plan

### Immediate (before wider user rollout)

1. Enforce publication and registration-window checks in all public-facing read and submit Edge Functions.
2. Add an internal function secret (or signed scheduler identity) to the cron email endpoint, and reject requests without it.
3. Review and trim event payload fields returned by public endpoints to minimum required fields.

### Near-term hardening

1. Add abuse controls for public flows beyond CORS, such as CAPTCHA or proof-of-human for lookup/submit endpoints.
2. Move rate limiting to a shared/distributed store for consistent limits across instances.
3. Define and document data retention and log retention policy for registration, attendance, and audit data.

### Governance and assurance

1. Create a recurring security regression checklist for each new Edge Function:
   - auth requirement,
   - role requirement,
   - server-side business gate checks,
   - input validation,
   - rate limit,
   - minimal response payload.
2. Add explicit tests that verify blocked behavior for:
   - unpublished events,
   - closed registration windows,
   - unauthorized cron invocation.

## Security Scorecard

Scoring date: 2026-08-12  
Scoring method: implementation-based review of current repository controls (not a penetration test)

### Weighted rubric

1. Authentication and identity verification: 20 points
2. Authorization and RLS policy posture: 20 points
3. Secure write-path architecture: 15 points
4. Input/data validation and integrity constraints: 15 points
5. Abuse resistance and anti-automation controls: 15 points
6. Operational controls (auditability, scheduler hardening, security observability readiness): 15 points

Total possible score: 100 points

### Current score

1. Authentication and identity verification: 15/20

- Strong token and admin-role verification in shared edge guard.
- Deduction for unauthenticated cron endpoint path.

2. Authorization and RLS policy posture: 18/20

- Strong table-level RLS adoption and role helper usage.
- Deduction for business-state enforcement gaps in selected public function logic.

3. Secure write-path architecture: 13/15

- Public writes are routed through Edge Functions and direct anon writes are revoked.
- Deduction for missing server-side event availability gates in submit flows.

4. Input/data validation and integrity constraints: 13/15

- Strong boundary validation and DB constraints for core integrity.
- Deduction for inconsistent server-side business-rule enforcement on event publication/window checks.

5. Abuse resistance and anti-automation controls: 7/15

- Positive: endpoint rate limiting and strict origin handling.
- Deduction: in-memory limiter is instance-local; CORS is not a strong caller identity control.

6. Operational controls (auditability, scheduler hardening, security observability readiness): 7/15

- Positive: admin action audit logging exists for sensitive flows.
- Deduction: scheduler endpoint lacks request authentication hardening.

Overall score: 73/100

### Score interpretation

- 90-100: strong production-hard posture with mature controls and low residual risk.
- 80-89: solid production posture with limited, manageable hardening backlog.
- 70-79: good foundation, but important hardening items should be addressed before broad exposure.
- Below 70: elevated risk; major controls or enforcement layers are incomplete.

Current band: 70-79 (good foundation, targeted hardening required before wider rollout).

### Expected score after high-priority remediations

If the High priority items in this document are completed, expected score range is 85-89.

Expected uplift drivers:

- server-side event publication and window enforcement in public read/submit paths,
- authenticated scheduler endpoint invocation,
- stronger abuse-prevention posture for public endpoints.

## Residual Risk Statement

Current implementation has strong foundational controls (RLS, role checks, validated backend write paths, and common middleware). The primary residual risk is not foundational weakness, but missing server-side business gate enforcement in selected public endpoints and an unauthenticated scheduler endpoint. Addressing these items materially improves confidentiality and abuse resistance.

## Scope Notes

- This document describes application-layer controls observable in this codebase.
- Platform-level controls provided by hosting infrastructure (for example managed encryption at rest, provider-managed network controls) are not exhaustively evaluated here and should be covered in infrastructure/security compliance documentation.
