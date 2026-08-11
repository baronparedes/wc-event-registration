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

High-priority findings from the previous revision have been remediated:

1. Public event detail endpoint now enforces `status = 'published'` server-side.
2. Public event-fields endpoint now verifies the parent event is published before returning fields.
3. Public/member registration submit handlers now enforce server-side event availability gates:
   - `status = 'published'`
   - registration mode open/closed
   - registration open/close window checks.
4. Scheduled email export endpoint now requires JWT verification (`verify_jwt = true`) in function config.

Residual note:

- The cron hardening uses signed scheduler identity (JWT verification) rather than a separate custom function secret, which is acceptable when the caller is Supabase-managed.

### Medium priority

1. ✅ **COMPLETED**: Public event detail payload included broad event fields.

- Status: Payload trimmed to 13 essential fields (was 17).
- Fields removed: `status`, `duplicate_policy`, `created_by_admin_id`, `created_at`, `updated_at`.
- Blast radius reduced for public event detail endpoint.

1. ✅ **MITIGATED**: Some public endpoints rely on CORS allowlist as a traffic gate.

- Status: Added suspicious request detection with stricter rate limiting.
- Implementation: Non-browser clients (missing/bot User-Agent) now hit rate limits 5x faster (0.2x multiplier).
- Patterns detected:
  - Missing User-Agent header
  - CLI tools: curl, wget, python, perl, ruby, java, go, node, requests
  - Bot signatures: bot, crawler, spider, scraper
- Effect: Makes CORS-bypass abuse harder; legitimate browsers unaffected.
- Remaining gap: Sophisticated attackers with spoofed User-Agents can still abuse limits; CAPTCHA still recommended.

1. In-memory rate limiting is per runtime instance.

- Observation:
  - Rate-limit buckets are maintained in-memory in each function runtime.
- Risk:
  - Limits may be bypassed in multi-instance scenarios or after cold starts.

1. ✅ **APPROVED (RISK ACCEPTED WITH CONTROLS)**: Public avatar bucket remains configured as public.

- Decision:
  - `member_avatars` remains a public bucket to maximize CDN caching and minimize backend resource consumption on the Supabase free tier.
- Business rationale:
  - Public, cacheable avatar delivery reduces repeated origin fetch/processing and keeps operational cost and latency low.
- Accepted risk:
  - Object URLs are publicly retrievable if discovered.
- Compensating controls (Option 1):
  - Use high-entropy, non-enumerable object keys (no member ID, email, or predictable naming in paths).
  - Enforce strict upload validation (MIME allowlist, file-size cap, and image dimension limits).
  - Re-encode uploads and strip image metadata (including EXIF) before persistence.
  - Treat avatars as low-sensitivity display assets; provide default avatar fallback for users who opt out of photo exposure.
  - Rotate object keys on avatar replacement to reduce long-lived URL reuse.
- Governance note:
  - This is an explicit policy-approved tradeoff for low-sensitivity profile photos under current free-tier constraints.

## Recommended Remediation Plan

### Immediate (before wider user rollout)

1. ✅ **COMPLETED**: Review and trim event payload fields returned by public endpoints to minimum required fields.
   - Public event endpoint now returns only essential fields (13 vs 17).
2. Add explicit regression tests for blocked behavior on unpublished and closed events, and unauthorized scheduler access.

### Near-term hardening

1. Add proof-of-human (CAPTCHA) for high-risk public flows (member-lookup, submit endpoints).
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

1. Authentication and identity verification: 19/20

- Strong token and admin-role verification in shared edge guard.
- Cron endpoint now requires JWT verification in function config.
- Minor deduction for remaining public endpoints that intentionally run without end-user auth and therefore rely on other controls.

1. Authorization and RLS policy posture: 20/20

- Strong table-level RLS adoption and role helper usage.
- Public event/event-field read paths now enforce publication state in function logic.
- Public event detail payload minimized to essential fields only.

1. Secure write-path architecture: 15/15

- Public writes are routed through Edge Functions and direct anon writes are revoked.
- Registration submit handlers now enforce server-side event availability gates.

1. Input/data validation and integrity constraints: 14/15

- Strong boundary validation and DB constraints for core integrity.
- Business-rule enforcement for event publication/window checks is now consistently applied in submit paths.
- Minor deduction for remaining assurance gap until explicit regression tests are added for all blocked scenarios.

1. Abuse resistance and anti-automation controls: 11/15

- Positive: endpoint rate limiting with suspicious request detection (User-Agent fingerprinting).
- Positive: Non-browser clients now hit rate limits 5x faster (curl, bots, CLI tools).
- Positive: strict origin handling.
- Deduction: in-memory limiter is instance-local (doesn't protect against distributed attacks).
- Remaining gap: sophisticated User-Agent spoofing can still bypass detection; CAPTCHA recommended for high-risk endpoints.

1. Operational controls (auditability, scheduler hardening, security observability readiness): 10/15

- Positive: admin action audit logging exists for sensitive flows.
- Positive: scheduler endpoint now enforces JWT verification.
- Deduction: security observability and distributed abuse controls are still limited.

Overall score: 89/100 (↑ from 86/100)

### Score interpretation

- 90-100: strong production-hard posture with mature controls and low residual risk.
- 80-89: solid production posture with limited, manageable hardening backlog.
- 70-79: good foundation, but important hardening items should be addressed before broad exposure.
- Below 70: elevated risk; major controls or enforcement layers are incomplete.

Current band: 80-89 (solid production posture with limited, manageable hardening backlog).

### Improvements Since Last Revision

- **Payload minimization**: Public event endpoint now returns only 13 essential fields (was 17). Removed audit fields and internal metadata.
- **Suspicious request detection**: Non-browser clients (missing/bot User-Agent) now experience 80% stricter rate limiting. Makes casual bot abuse 5x harder.
- **Score uplift**: +3 points (Authorization/RLS: +1, Abuse resistance: +4 for improved controls).

### Expected score after remaining hardening

If remaining medium-priority hardening items in this document are completed, expected score range is 92-95.

Expected uplift drivers:

- distributed (cross-instance) rate limiting,
- CAPTCHA or proof-of-human for high-risk endpoints (member-lookup, submit),
- improved security observability and recurring regression coverage.

## Residual Risk Statement

Current implementation has strong foundational controls (RLS, role checks, validated backend write paths, middleware controls, and server-side business gate enforcement on public reads/submits). Recent improvements include payload minimization and suspicious request detection for abuse mitigation. The primary residual risk remains distributed attacks and sophisticated adversaries with spoofed User-Agents; CAPTCHA and distributed rate limiting are recommended for final hardening before broad exposure.

Avatar storage is intentionally public for CDN and free-tier efficiency. This is a documented and approved low-sensitivity risk with compensating controls (unguessable keys, strict upload limits, and metadata stripping).

## Scope Notes

- This document describes application-layer controls observable in this codebase.
- Platform-level controls provided by hosting infrastructure (for example managed encryption at rest, provider-managed network controls) are not exhaustively evaluated here and should be covered in infrastructure/security compliance documentation.
