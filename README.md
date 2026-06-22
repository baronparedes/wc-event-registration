# WC Event Registration Platform

Scalable event registration platform using React + Supabase.

## Current Status

Chunk 0 foundation is implemented:

- React + TypeScript + Vite app scaffolded
- Route architecture scaffolded for public and admin modules
- Theme A Civic Trust design tokens and typography applied
- Core library stack installed (Supabase client, forms, validation, routing, query layer)
- Supabase client scaffolding and environment contract added

## Locked Decisions

- UI stack: Shadcn UI + Tailwind + Radix primitives
- Form stack: React Hook Form + Zod
- Theme: Theme A Civic Trust
- Admin scope: global admins in v1 (future event-scoped extension planned)
- Registration rule: mandatory ID lookup first, always

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

## Next Implementation Chunk

Chunk 1: Database skeleton + users CSV import pipeline

- create schema migrations
- create staging and import validation SQL
- upsert validated users into master users table
- capture rejected rows to import_errors
