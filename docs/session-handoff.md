# Session Handoff

Last updated: 2026-06-22

## Project Snapshot

This repository is in Chunk 3 implemented locally status.

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

Core decisions locked:

- Public flow must always be ID-first
- UI stack: Shadcn UI + Tailwind + Radix
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Duplicate policy is per-event: block or allow update
- Admin scope in v1: global admin
- Export in v1: CSV

## Current Focus

Next planned work is Chunk 4 only:

- render dynamic event fields from metadata
- runtime validation for dynamic field definitions and responses
- preserve ID-first gate as a hard prerequisite before field rendering
- prepare clean handoff into Chunk 5 secure submit path

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
