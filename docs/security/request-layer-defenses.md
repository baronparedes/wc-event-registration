# Request Layer Defenses

Last updated: 2026-08-12

## Overview

Public Edge Functions use a **layered defense** to prevent abuse. This document explains each layer and what it protects against.

## Current Layers (Implemented)

### 1. CORS Allowlist ⚠️ Browser-Only

- **What it does:** Prevents browsers from making requests to disallowed origins via `Origin` header validation.
- **Threat model:** Stops browser-based CSRF and cross-origin access attempts.
- **Limitation:** Non-browser clients (scripts, bots, curl, etc.) can spoof or omit the `Origin` header entirely.
- **Verdict:** One layer of defense, **not standalone protection**.

### 2. Rate Limiting (In-Memory, Per-Instance) + Suspicious Request Detection

- **What it does:**
  - Tracks request volume by IP/origin and rejects high-frequency requests with 429 status.
  - Detects suspicious requests (missing User-Agent, known bot patterns) and applies 80% stricter rate limits.
- **Presets (browser clients):**
  - Public registration submit: 20 requests/min (4 for suspicious)
  - Member lookup: 60 requests/min (12 for suspicious)
  - Event detail/fields: 30 requests/min (6 for suspicious)
- **Threat model:** Prevents simple request floods; makes bot abuse harder by reducing limit for non-browser clients.
- **Limitation:** Buckets are in-memory and per-instance; distributed attacks still possible.
- **Verdict:** Good deterrent against casual abuse; sophisticated attackers with spoofed User-Agents can still exceed limits.

### 3. Request Validation

- **What it does:** Validates request body against Zod schemas before processing.
- **Threat model:** Rejects malformed or unexpected payloads early.
- **Verdict:** Good hygiene; prevents injection and logic errors.

### 4. Server-Side Business Gates

- **What it does:** Enforces event availability (published, open registration window, etc.) server-side.
- **Threat model:** Prevents bypassing frontend UI constraints.
- **Verdict:** Essential; must always be enforced.

## Gaps & Future Work

### High Priority: Proof-of-Human (CAPTCHA or Alternative)

- **Why needed:** Rate limiting + CORS alone don't stop coordinated bots.
- **Where:** High-risk endpoints:
  - `member-lookup` (60 req/min limit)
  - `submit-public-registration` (20 req/min limit)
  - `submit-registration` (20 req/min limit, member-only but still high-risk)
- **Implementation:** CAPTCHA (hCaptcha/reCAPTCHA) or proof-of-work token
- **Timeline:** Before wider public rollout.

### Medium Priority: Distributed Rate Limiting

- **Why needed:** Current in-memory limits are per-instance and reset on cold start.
- **Where:** All public endpoints.
- **Implementation:** Deno KV or Redis-backed bucketing.
- **Timeline:** Post-launch hardening.

### Medium Priority: Request Fingerprinting ✅ IMPLEMENTED

- **What it does:** Detect suspicious requests (missing/bot User-Agent) and apply stricter rate limits (20% of normal).
- **Patterns detected:**
  - Missing User-Agent header
  - CLI tools: curl, wget, python, ruby, java, node, etc.
  - Bot signatures: bot, crawler, spider, scraper
- **Effect:** Non-browser clients hit rate limits 5x faster than legitimate browser users.
- **Timeline:** Completed 2026-08-12.

## Deployment Checklist

Before wider user rollout, verify:

- [x] Request fingerprinting implemented: detects suspicious User-Agents and applies stricter rate limits
- [ ] Proof-of-human (CAPTCHA) implemented on high-risk endpoints
- [ ] Regression tests pass for blocked scenarios (unpublished events, closed windows, unauthorized access)
- [ ] Rate limit presets reviewed against expected load (remember: 20% effective limits for suspicious requests)
- [ ] `ALLOWED_ORIGINS` correctly configured for deployment environment
- [ ] Production `RUNTIME_ENV=production` prevents localhost origins in allowlist

## References

- [Data Security Implementation and Gaps](./data-security-implementation-and-gaps.md) (Medium Priority section)
- Edge Functions security helpers: `supabase/functions/_shared/security.ts`
- Rate limit constants: `supabase/functions/_shared/constants.ts`
