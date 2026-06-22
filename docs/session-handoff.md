# Session Handoff

Last updated: 2026-06-22

## Project Snapshot

This repository is in Chunk 1 implemented locally status.

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

Core decisions locked:

- Public flow must always be ID-first
- UI stack: Shadcn UI + Tailwind + Radix
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Duplicate policy is per-event: block or allow update
- Admin scope in v1: global admin
- Export in v1: CSV

## Current Focus

Next planned work is Chunk 2 only:

- enable and test RLS on all public tables
- add admin role-check policies
- define controlled public read/write paths
- build a role policy test matrix before wiring frontend data access

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

I want to continue my project. Read docs/session-handoff.md and docs/implementation-plan.md, then continue with Chunk 2 only in learning mode (explain, implement, verify, pause).

## Resume Prompt (Detailed)

I want to continue my React + Supabase event registration project.
Read docs/session-handoff.md and docs/implementation-plan.md first.
Continue with Chunk 2 only:

1. enable RLS on Chunk 1 tables
2. create admin and public access policies
3. validate policy behavior with explicit SQL tests
4. pause before frontend data wiring
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

## Local Verification Notes

- Local Supabase URL: http://127.0.0.1:54321
- Local DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Set VITE_SUPABASE_URL to the local URL and VITE_SUPABASE_ANON_KEY to the local publishable key from npm run supabase:status when testing against local services.

## Related Docs

- docs/implementation-plan.md
- README.md
