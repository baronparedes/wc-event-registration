---
name: database-migrations
description: >-
  Authoring, structuring, and reviewing Supabase database migrations in
  supabase/migrations/. Enforces strict timestamp-based naming
  (YYYYMMDDHHMMSS_description.sql), single responsibility per migration,
  idempotent DDL/policies, RPC signature preservation, service_role security
  checks, and local testing workflows.
---

# Supabase Database Migrations Authoring Guide

**Context:** This skill governs how Supabase SQL migration files are authored, organized, and verified in `supabase/migrations/`. It prevents accidental regressions, ensures reviewability, and guarantees migration idempotency.

---

## 1. Naming & File Conventions

All migration files MUST follow the strict timestamped naming pattern:

```
supabase/migrations/YYYYMMDDHHMMSS_<descriptive_action_name>.sql
```

- **Format:** 14-digit UTC/local timestamp (`YYYYMMDDHHMMSS`) followed by snake_case description.
- **Example:** `20260926164000_create_service_exception_dates_table.sql`
- **Chronological Sequence:** Never backdate timestamps behind already applied migrations on `main`. Ensure each new migration's timestamp is strictly later than existing migrations.

---

## 2. Single Responsibility & Migration Decomposition

**Rule:** Do NOT bundle unrelated table creations, structural changes, and multiple large RPC updates into a single monolithic migration.

- **Break Down Large Changes:**
  - **Migration 1:** Table creation, constraints, indexes, RLS policies, and grants.
  - **Migration 2..N:** Individual RPC updates or distinct feature logic.
- **Why?** Monolithic migrations are error-prone during review, difficult to debug on failure, and risk partial commit states in environments with non-transactional DDL steps.

---

## 3. Authoring Guidelines & Patterns

### A. Transactions

Wrap migrations in `begin;` and `commit;`:

```sql
begin;

-- DDL / DML / Functions
commit;
```

### B. Idempotent Table & Policy Creation

Always use defensive and idempotent statements:

```sql
create table if not exists public.my_table (
  id uuid primary key default gen_random_uuid (),
  created_at timestamptz not null default now ()
);

alter table public.my_table enable row level security;

-- Drop policies before creating to avoid 42710 duplicate policy errors
drop policy if exists "allow authenticated read" on public.my_table;

create policy "allow authenticated read" on public.my_table for
select
  to authenticated using (true);

drop policy if exists "allow service_role all" on public.my_table;

create policy "allow service_role all" on public.my_table for all to service_role using (true)
with
  check (true);

grant
select
  on public.my_table to authenticated;

grant all on public.my_table to service_role;
```

### C. Modifying Existing RPC Functions (CRITICAL)

When modifying an existing PostgreSQL function with `create or replace function`:

1. **Never Rename Parameters In-Place:** PostgreSQL throws `SQLSTATE 42P13: cannot change name of input parameter` if parameter names or order change without dropping the old signature first.
2. **Inspect Existing Migration First:** Always read the _most recent_ migration defining the RPC to preserve:
   - Exact input parameter names and types.
   - Column aliases and return table structure.
   - Authorization checks (`is_admin_viewer()`, `service_role`, `auth.role() = 'service_role'`, `current_user = 'service_role'`).
   - Filter criteria (e.g. multi-role string matching, nickname searches).
3. **Preserve Grants & Revokes:** Re-grant permissions at the bottom of the migration:
   ```sql
   revoke execute on function public.my_function(...) from public, anon, authenticated;
   grant execute on function public.my_function(...) to authenticated, service_role;
   ```
4. **Dropping Signatures When Necessary:** If parameter types or count must genuinely change:
   ```sql
   drop function if exists public.my_function (uuid, date, text);
   ```

### D. Security & Access Control (Strictly No `anon` Access)

- **No `anon` Table Privileges or Policies:** Do NOT grant permissions (`grant select/insert/update/delete ... to anon`) or create RLS policies for `anon` users on internal/domain tables.
- **Explicit Grants:** Only grant table and function access to `authenticated` and `service_role`.
- **Revoke Public/Anon Defaults:** For security-definer RPCs, always revoke execute permissions from `public` and `anon`:
  ```sql
  revoke execute on function public.my_function(...) from public, anon, authenticated;
  grant execute on function public.my_function(...) to authenticated, service_role;
  ```

---

## 4. Verification Checklist

Before finalizing any migration:

- [ ] Migration filename matches `YYYYMMDDHHMMSS_description.sql`.
- [ ] Scope is focused (1 table or 1 RPC per file when possible).
- [ ] Strictly no `anon` access or table privileges granted.
- [ ] RLS policies include `drop policy if exists` guards.
- [ ] Modified functions maintain parameter signatures and `service_role` checks.
- [ ] Run `npm run format` to ensure SQL syntax and file formatting align.
