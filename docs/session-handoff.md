# Session Handoff

Last updated: 2026-06-22

## Project Snapshot

This repository is in Chunk 0 complete status.

Implemented in Chunk 0:
- React + TypeScript + Vite scaffold
- App route shell for public and admin paths
- Theme A Civic Trust tokens and typography baseline
- Supabase client scaffold and env contract
- Prettier setup added for formatting consistency

Core decisions locked:
- Public flow must always be ID-first
- UI stack: Shadcn UI + Tailwind + Radix
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Duplicate policy is per-event: block or allow update
- Admin scope in v1: global admin
- Export in v1: CSV

## Current Focus

Next planned work is Chunk 1 only:
- create Supabase migration structure
- add core schema tables
- add indexes and constraints
- add users CSV import pipeline:
  - staging table
  - validation SQL
  - upsert into users
  - import_errors for rejects

## Inputs Needed At Start Of Chunk 1

Provide these before finalizing import SQL:
- CSV file path
- exact CSV headers
- required vs optional columns
- invalid-row behavior preference (skip-and-log vs fail-all)
- email validation strictness

## Resume Prompt (Simple)

I want to continue my project. Read docs/session-handoff.md and docs/implementation-plan.md, then continue with Chunk 1 only in learning mode (explain, implement, verify, pause).

## Resume Prompt (Detailed)

I want to continue my React + Supabase event registration project.
Read docs/session-handoff.md and docs/implementation-plan.md first.
Continue with Chunk 1 only:
1. set up Supabase migrations
2. create core tables (users, admins, events, event_fields, registrations, registration_answers)
3. add indexes and constraints for duplicate behavior
4. implement users CSV import pipeline (staging, validation, upsert, import_errors)
Work in beginner-friendly teaching mode:
- explain each step and why
- implement changes
- give verification commands/checks
- pause for review before Chunk 2

## Quick Verify Commands

Run these before continuing in a new session:
- npm install
- npm run format:check
- npm run build

## Related Docs

- docs/implementation-plan.md
- README.md
