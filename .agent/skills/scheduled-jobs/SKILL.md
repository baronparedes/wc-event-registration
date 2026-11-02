---
name: scheduled-jobs
description: >-
  Authoring, scheduling, securing, and testing recurring background cron jobs
  using Supabase pg_cron, pg_net, PGMQ queues, Vault secrets, and GitHub Actions
  scheduled workflows.
---

# Scheduled Jobs & Automated Crons Skill

**Context:** This skill governs how scheduled jobs and cron workers are designed, scheduled via SQL migrations, authenticated, tested, and maintained across Welcome Hub.

---

## 1. Core Architecture & Execution Model

Welcome Hub implements a decoupled cron pattern:

1. **Scheduling Engine:** PostgreSQL `pg_cron` extension runs scheduled tasks in the database against **UTC**.
2. **Timezone Rule:** The application's operational timezone is **Asia/Manila (PHT, UTC+8)**. All cron expressions must explicitly convert Manila time to UTC before scheduling in `cron.schedule()`.
   - _Example:_ Friday 06:00 AM PHT = Thursday 22:00 UTC (`0 22 * * 4`).
   - _Example:_ Monday 08:00 AM PHT = Monday 00:00 UTC (`0 0 * * 1`).
3. **Dispatch & Workers:**
   - **Queue-based jobs:** Database functions enqueue work items into PGMQ queues (`email_notifications`, `push_notifications`) and immediately trigger the worker Edge Function via `pg_net` (`net.http_post`).
   - **Queue Sweepers:** Dedicated `pg_cron` sweeper jobs run every 15 minutes (`*/15 * * * *`) as a fallback to drain queues and handle transient errors.
   - **Direct-dispatch jobs:** `pg_cron` directly triggers Edge Functions via `net.http_post` for report generation, AI debriefs, and CSV exports.

---

## 2. SQL Migration Authoring Rules for Crons

Every migration introducing or modifying a `pg_cron` job MUST follow these conventions:

### A. Idempotent Unschedule Pattern

Never call `cron.schedule()` without first unscheduling any pre-existing job with the same name inside an exception handler block:

```sql
begin;

do $$
begin
  perform cron.unschedule('job_name_here');
exception when others then
  null;
end $$;

select
  cron.schedule(
    'job_name_here',
    '<cron_expression>',
    $$
    select net.http_post(
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        current_setting('app.settings.project_url', true)
      ) || '/functions/v1/<edge-function-name>',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Key', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'cron_role_key' limit 1),
          current_setting('app.settings.cron_role_key', true)
        )
      )
    );
    $$
  );

commit;
```

### B. Security Definer & Permission Hardening

Wrapper functions that invoke `pg_net` or generate queues MUST:

- Be declared `security definer`.
- Set `search_path = public`.
- Revoke execution from `public`, `anon`, and `authenticated`.
- Grant execution strictly to `service_role`.

```sql
create or replace function public.trigger_my_job_processor()
returns void
language plpgsql
security definer
set search_path = public as $$
...
$$;

revoke execute on function public.trigger_my_job_processor() from public, anon, authenticated;
grant execute on function public.trigger_my_job_processor() to service_role;
```

### C. Vault Secret Resolution Standard

Do NOT hardcode project URLs or API keys into SQL migrations. Always resolve `project_url` and `cron_role_key` dynamically from Supabase Vault (`vault.decrypted_secrets`), with fallback to `current_setting('app.settings...', true)` for local environments.

---

## 3. Edge Function Cron Handlers

Edge Functions invoked by scheduled jobs (typically named with prefix `cron-`) must adhere to:

1. **Authorization via `useEdgeHook`:**
   ```ts
   const guard = await useEdgeHook({
     req,
     functionName: 'cron-my-scheduled-job',
     method: 'POST',
     requireAdmin: true,
     allowCronRole: true,
     allowServiceRole: true,
     requiredPermission: 'canWriteAdminData',
     rateLimit: {
       scope: 'cron-my-scheduled-job',
       windowMs: RATE_LIMIT_PRESETS.cron.myScheduledJob.windowMs,
       maxHits: RATE_LIMIT_PRESETS.cron.myScheduledJob.maxHits,
     },
   });
   ```
2. **`config.toml` Registration:**
   Every cron function must be registered in `supabase/config.toml`:
   ```toml
   [functions.cron-my-scheduled-job]
   verify_jwt = false # Since authorization is performed via X-Cron-Key in useEdgeHook
   ```
3. **Idempotency Guarantees:**
   - Database generators must log the processed target date (e.g., in a dedicated log table like `email_reminder_logs` or `push_reminder_logs` with a unique constraint on `sunday_date`).
   - If a job is triggered twice within the same window, it must cleanly exit without creating duplicates.

---

## 4. GitHub Actions Workflows

Automated infrastructure and maintenance tasks running on a schedule (e.g. `.github/workflows/supabase-backup.yml`, `supabase_keepalive.yml`) must:

- Document the schedule in both UTC and Asia/Manila in workflow comments.
- Include `workflow_dispatch:` to enable manual out-of-schedule triggers.
- Secure secrets via GitHub Repository Secrets (e.g., `R2_ACCESS_KEY_ID`, `APP_URL`).

---

## 5. Testing & Verification Checklist

When creating or modifying scheduled jobs:

1. **Deno Unit Tests:** Author comprehensive unit tests in `supabase/functions/<cron-function>/__tests__/handler.test.ts` verifying:
   - Request rejects unauthorized callers (missing or invalid `X-Cron-Key`).
   - Request succeeds with authorized cron key.
   - Idempotent execution paths.
2. **Local Validation:**
   - Execute `npm run test:edge` or `npm run precommit` to run Deno test suites.
   - Validate formatting and linting.
3. **Documentation:**
   - Update the master catalog in [`docs/guides/scheduled-jobs-and-crons.md`](file:///Users/baronpatrickparedes/Projects/wc-event-registration/docs/guides/scheduled-jobs-and-crons.md).
