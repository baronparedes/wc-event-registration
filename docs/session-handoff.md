# Session Handoff

Last updated: 2026-06-22

## Project Snapshot

This repository is in Chunk 4 complete + architectural standardization status.

Implemented in Chunk 0:

- React + TypeScript + Vite scaffold
- App route shell for public and admin paths
- Theme A Civic Trust tokens and typography baseline
- Supabase client scaffold and env contract
- Prettier setup added for formatting consistency

Implemented in Chunk 1:

- Supabase local project scaffold in supabase/
- core schema migration for users, admins, events, event_fields, registrations, registration_answers
- schema constraints and indexes for ID lookup invariant and duplicate registration control
- users_import_staging and import_errors tables
- fail-fast process_members_import_batch SQL function tailored to members_info.csv
- package scripts for local Supabase lifecycle and migration reset
- private local member seed generator and ignored seed workflow

Implemented in Chunk 2:

- RLS enabled on all 8 public tables
- `public.is_admin()` SECURITY DEFINER helper function
- Explicit policies for every table/role combination
- anon and authenticated (non-admin): read published events and their fields only
- admin role: full CRUD on all tables via is_admin() check
- No direct public write path on registrations/answers (reserved for Chunk 5 function)
- RLS test matrix in supabase/snippets/rls_policy_tests.sql (run in Studio SQL editor)

Implemented in Chunk 3:

- Public registration route now loads events by slug with availability checks
- Event gate states implemented: available, not open yet, closed, and generic unavailable
- ID-first gate wired with React Hook Form + Zod validation
- `public.lookup_member_for_registration(text)` SECURITY DEFINER RPC added
- Minimal profile reveal implemented after successful lookup (full_name, nickname, first_name, last_name)
- SQL grants migration added so anon/authenticated roles can read events/event_fields under RLS filtering
- Local seed events added for public flow testing (`sample-event`, `future-event`, `closed-event`)

Implemented in Chunk 4:

- Dynamic event fields now load from `event_fields` metadata after successful ID lookup
- Runtime metadata guards added for dynamic field options and validation rules
- Runtime Zod schema generation added for all supported event field types
- Public registration page now renders dynamic field controls in display order
- Dynamic response validation and preview-only payload normalization implemented (no write path yet)
- `sample-event` local seed now includes representative dynamic fields across all field types

Architectural standardization (Chunk 4):

- Page-folder migration: all pages reorganized to `src/pages/<area>/<feature>/index.tsx` pattern
- Component colocalization: page-specific UI components moved to `src/pages/<feature>/components/` with barrel exports
- Library refactoring: `publicRegistration.ts` (900+ LOC) split into focused modules (types, queries, configValidation, dynamicSchema, transforms, index)
- SectionCard unification: all page sections now use shared primitive for consistent spacing and styling
- Copilot instructions enhanced: page-folder architecture rules, Supabase object pattern, vertical slice delivery pattern with completeness checklist
- All imports updated and verified; npm run build passes with zero errors

Core decisions locked:

- Public flow must always be ID-first
- UI stack: Shadcn UI + Tailwind + Radix
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Duplicate policy is per-event: block or allow update
- Admin scope in v1: global admin
- Export in v1: CSV

## Current Focus

Architecture is now ready for vertical slice feature delivery. All future features should follow:
- UI: page folder + colocated components + barrel exports
- Lib: domain module (types → validation → queries → transforms → index)
- DB: migration + RPC + RLS policy bundled as one atomic feature
- Test: happy path + critical error conditions

Next planned work is Chunk 5 only:

- wire secure submit path through controlled backend function
- apply duplicate policy behavior (`block` or `allow_update`) in submit flow
- persist registrations and registration_answers with idempotency handling
- preserve Chunk 4 ID-first and dynamic validation guarantees

## Decisions Captured During Chunk 4

- all `event_field_type` enum values are supported in runtime rendering and validation
- malformed dynamic field metadata fails closed with user-facing safety messaging
- dynamic field rendering remains fully blocked until ID lookup succeeds
- Chunk 4 submit action is validation preview only; no registrations/answers writes are introduced
- local QA seed strategy now includes full dynamic field coverage on `sample-event`
- page components are colocalized under page folders to keep page-specific UI self-contained and composable
- lib modules are split by responsibility (types, queries, validation, transforms) with barrel exports for stable import paths
- Copilot instructions document expected patterns for vertical slice delivery (anatomy, completeness checklist, coupling avoidance)

## Decisions Captured During Chunk 3

- generic public unavailable copy is used for invalid slug and unpublished event (`Event is not available.`)
- minimal profile reveal fields are locked to: full_name, nickname, first_name, last_name
- member lookup uses a SECURITY DEFINER RPC and does not permit direct public reads from `users`
- table privileges must be granted alongside RLS policies; RLS alone is not sufficient for API access
- local QA scenarios are seeded with three published events: open, future-open, and closed windows

## Decisions Captured During Chunk 2

- all public writes to registrations/answers go through a security-definer function (not direct INSERT policies)
- admins table self-read policy uses `auth_user_id = auth.uid()` (not is_admin()) to avoid bootstrap circular dependency
- is_admin() is SECURITY DEFINER so it can bypass admins table RLS during policy evaluation
- no waitlist or invite-only paths in v1; registration_mode enum reserved for future use

## Decisions Captured During Chunk 1

- local-first Supabase workflow before any hosted deployment
- CSV source: members_info.csv
- required CSV fields: RFID, Surname, Firstname
- invalid-row behavior: fail entire batch
- email validation strictness: lenient if email exists in future variants
- nickname is stored in users.nickname
- member role/category/schedule fields remain in users.metadata
- local member seed file is generated into ignored supabase/seeds/members.local.sql

## Resume Prompt (Simple)

I want to continue my project. Read docs/session-handoff.md and docs/implementation-plan.md, then continue with Chunk 4 only in learning mode (explain, implement, verify, pause).

## Resume Prompt (Detailed)

I want to continue my React + Supabase event registration project.
Read docs/session-handoff.md and docs/implementation-plan.md first.
Continue with Chunk 2 only:

1. load and render dynamic event fields from metadata
2. define runtime validation contract for dynamic fields
3. block field rendering unless member lookup gate is successful
4. pause before secure submit path wiring (Chunk 5)
   Work in beginner-friendly teaching mode:

- explain each step and why
- implement changes
- give verification commands/checks
- pause for review before Chunk 3

## Quick Verify Commands

Run these before continuing in a new session:

- npm install
- open Docker Desktop
- npm run supabase:start
- npm run supabase:status
- npm run seed:members:generate
- npm run supabase:db:reset
- npm run format:check
- npm run build

Quick manual route checks after dev server starts:

- /events/sample-event/register (available)
- /events/future-event/register (not open yet)
- /events/closed-event/register (closed)

## Local Verification Notes

- Local Supabase URL: http://127.0.0.1:54321
- Local DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Set VITE_SUPABASE_URL to the local URL and VITE_SUPABASE_ANON_KEY to the local publishable key from npm run supabase:status when testing against local services.

## Related Docs

- docs/implementation-plan.md
- README.md
