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

## Phase Plan

### Phase 1: Foundation and Security Baseline

- initialize app architecture and environment strategy
- establish auth boundaries and backend validation strategy
- add observability baseline

### Phase 2: Data Model and SQL Contract

- create core tables: users, admins, events, event_fields, registrations, registration_answers
- add event behavior flags: duplicate_policy, require_id_lookup, registration_mode
- add constraints and indexes
- add helper functions for open checks and submit-or-update

Users CSV import path:

- raw import staging table
- validation SQL (required columns, duplicate IDs, malformed emails)
- upsert validated rows into users table
- rejected rows saved to import_errors

### Phase 3: RLS and Security Controls

- enable RLS everywhere
- public read policies limited to active/open records
- public write via controlled backend function path
- admin CRUD/read policies with role checks
- rate limiting and audit logging controls

### Phase 4: Public Registration UX

- load event by slug with open/active prechecks
- enforce ID-first gate and minimal profile reveal
- render dynamic fields from metadata
- validate runtime schema
- submit through secure backend path with idempotency

### Phase 5: Admin Module

- protected admin routes
- event create/edit/archive
- field builder for all supported field types
- registrations list/detail and CSV export

### Phase 6: Hardening and Extensibility

- CAPTCHA and abuse protection
- duplicate/race-condition protections
- future hooks: waitlist, approvals, attendance

## Chunked Learning Delivery

### Chunk 0

Supabase foundations, app scaffold, route shell, theme baseline.

### Chunk 1

Database skeleton + users CSV import workflow.

### Chunk 2

RLS policy lab with role test matrix.

### Chunk 3

Public ID-first registration gate.

### Chunk 4

Dynamic fields and validation.

### Chunk 5

Secure submit path and duplicate policy logic.

### Chunk 6

Admin core pages and protected access.

### Chunk 7

Admin registrations and CSV export.

### Chunk 8

Hardening and future feature hooks.
