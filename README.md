# WC Event Registration Platform

Scalable event registration platform using React + Supabase.

## Current Status

Chunk 1 is implemented locally:

- React + TypeScript + Vite app scaffolded
- Route architecture scaffolded for public and admin modules
- Theme A Civic Trust design tokens and typography applied
- Core library stack installed (Supabase client, forms, validation, routing, query layer)
- Supabase client scaffolding and environment contract added
- Supabase local project scaffold and migration workflow added
- Core schema and member import pipeline implemented
- Private local member seed workflow added

## Locked Decisions

- UI stack: Shadcn UI + Tailwind + Radix primitives
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Admin scope: global admins in v1 (future event-scoped extension planned)
- Registration rule: mandatory ID lookup first, always

## Coding Standards For Copilot

Project-level AI coding standards live in [.github/copilot-instructions.md](.github/copilot-instructions.md).

Use that file as the default source of truth for:

- React and TypeScript scalability standards
- Data boundary validation and form conventions
- Query, state, and error-handling patterns
- Chunk boundary discipline and verification expectations

## Route Skeleton

Public:

- /
- /events/:slug/register

Admin:

- /admin/login
- /admin/events
- /admin/events/new
- /admin/events/:id
- /admin/events/:id/fields
- /admin/events/:id/registrations

## Setup

1. Install dependencies

   npm install

2. Create environment file

   cp .env.example .env.local

3. Fill environment variables in .env.local

4. Start dev server

   npm run dev

5. Build for production

   npm run build

## Environment Variables

See .env.example.

Required values:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Local Supabase Workflow

Chunk 1 is designed to run fully locally before any deployment.

1. Start Docker Desktop.
2. Start the local Supabase stack.

   npm run supabase:start

3. Inspect local credentials and service URLs.

   npm run supabase:status

4. Copy the local Project URL and Publishable key into .env.local.

   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status>

5. Apply all migrations from scratch.

   npm run supabase:db:reset

6. If you want to load your private local member dataset, generate the ignored seed file first.

   npm run seed:members:generate

7. Re-run the database reset so the local member seed is applied.

   npm run supabase:db:reset

8. Stop the local stack when done.

   npm run supabase:stop

To create a new migration:

npm run supabase:migration:new -- migration_name_here

Only link and push to a hosted Supabase project after local validation succeeds.

## Private Local Seed Workflow

The repository supports a repeatable local-only member seed without committing member data.

- Keep your source CSV in the ignored members_info.csv file.
- Generate the ignored SQL seed with npm run seed:members:generate.
- The generated file is written to supabase/seeds/members.local.sql and is ignored by Git.
- Running npm run supabase:db:reset will apply that local seed after migrations.

This lets you reset local development data repeatedly while keeping member records out of source control.

Local admin account seed (for admin route testing):

- Email: local@admin.com
- Password: Supabase@123
- Seed source: supabase/seeds/dev.local.sql (local development only, git-ignored)

## Next Implementation Chunk

Chunk 2: RLS and security controls

- enable RLS across public tables
- add admin role-check policies
- define controlled public read and write paths
- validate policy behavior with SQL test cases

## Chunk 1 Database Scope

Implemented locally in Supabase migrations:

- core tables: users, admins, events, event_fields, registrations, registration_answers
- event invariants and indexes for duplicate registration control
- users_import_staging and import_errors tables
- process_members_import_batch function for fail-fast member imports

Current members CSV contract comes from members_info.csv:

- RFID maps to users.member_id
- Surname and Firstname are required
- full_name is derived from Firstname + Surname
- Nickname is stored in users.nickname
- Role, Category, SR_PWD, IsOIC, and Sunday availability are stored in users.metadata
