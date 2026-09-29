# Automated Sunday Service Push Reminders Guide

This document outlines the architecture, data flow, scheduling mechanism, security model, and idempotency guarantees for the **Automated Sunday Service Push Reminder** system.

---

## 📑 Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Component Diagram](#2-architecture--component-diagram)
3. [End-to-End Workflow](#3-end-to-end-workflow)
4. [Database Layer & Queue Mechanics](#4-database-layer--queue-mechanics)
   - [Sunday Ordinal & Schedule Resolution](#sunday-ordinal--schedule-resolution)
   - [Idempotency & Duplicate Protection](#idempotency--duplicate-protection)
   - [PGMQ Queue Integration](#pgmq-queue-integration)
5. [Edge Function Processing (`cron-process-push-reminders`)](#5-edge-function-processing-cron-process-push-reminders)
   - [Batch Processing Loop](#batch-processing-loop)
   - [Web Push Payload & Deep Linking](#web-push-payload--deep-linking)
   - [Stale Subscription Auto-Pruning](#stale-subscription-auto-pruning)
6. [Security & Authentication Model](#6-security--authentication-model)
   - [Dedicated `CRON_ROLE_KEY` Validation](#dedicated-cron_role_key-validation)
   - [Vault Storage](#vault-storage)
7. [Deployment & Configuration Reference](#7-deployment--configuration-reference)

---

## 1. System Overview

The Automated Sunday Service Push Reminder system automatically notifies volunteers and members of their scheduled Sunday service commitments.

### Key Characteristics:

- **Zero Manual Admin Action**: Runs on an automated schedule via `pg_cron` and Supabase Edge Functions.
- **Strict Idempotency**: Each user receives at most **one** push reminder per upcoming Sunday.
- **Deep Linking**: Push notifications direct users directly to [`/profile?tab=commitments`](/profile?tab=commitments) to view their schedule.
- **Decoupled Security**: Authenticated via a dedicated `CRON_ROLE_KEY` stored in Supabase Vault without exposing `SUPABASE_SERVICE_ROLE_KEY` in plain text.

---

## 2. Architecture & Component Diagram

```mermaid
flowchart TD
    A["pg_cron (process_push_reminders_15m)"] -->|"1. Fetch vault secrets & trigger POST"| B["Edge Function: cron-process-push-reminders"]
    B -->|"2. Authenticate (X-Cron-Key)"| B
    B -->|"3. Call generate_upcoming_sunday_push_reminders()"| C["PostgreSQL: users metadata"]
    C -->|"4. Check target Sunday & idempotency logs"| D["Table: push_reminder_logs"]
    D -->|"5. Enqueue reminders"| E["pgmq: push_reminders_queue"]
    B -->|"6. Pull batch (pop_push_reminders)"| E
    B -->|"7. Fetch active subscriptions"| F["Table: user_push_subscriptions"]
    B -->|"8. Send VAPID Web Push"| G["Web Push Services (Apple / Google / Mozilla)"]
    G -->|"9. Deliver to device with /profile link"| H["User Device (Mobile / Desktop)"]
    B -->|"10. Prune 404/410 dead tokens"| F
    B -->|"11. Archive completed messages"| E
```

---

## 3. End-to-End Workflow

1. **Triggering**: Every 15 minutes (`*/15 * * * *`), `pg_cron` calls `net.http_post` targeting the `cron-process-push-reminders` edge function with the header `X-Cron-Key`.
2. **Authentication**: `useEdgeHook` inspects `X-Cron-Key` (or `Bearer <key>`) against the environment variable `CRON_ROLE_KEY` and authorizes the request as `callerType = 'cron'`.
3. **Generation**: The function executes the database RPC `generate_upcoming_sunday_push_reminders()`.
4. **Resolution**:
   - Calculates the target date of the nearest upcoming Sunday in Manila Time (`Asia/Manila`, UTC+8).
   - Computes whether it is the 1st, 2nd, 3rd, 4th, or 5th Sunday of that month.
   - Maps to the user's commitment field (`first_sunday`, `second_sunday`, `third_sunday`, `fourth_sunday`, `fifth_sunday` in `users.metadata`).
5. **Idempotency Guard**: For each user with scheduled commitments, it attempts to insert into `push_reminder_logs(user_id, target_date)`. If an entry already exists for that user on that specific Sunday, it skips that user.
6. **Queue Enqueue**: New reminders are written to `push_reminders_queue` (managed by PostgreSQL Message Queue `pgmq`).
7. **Queue Processing**: The edge function reads up to 50 messages per batch from `pop_push_reminders()`.
8. **Delivery**: For each message, queries the user's active Web Push subscriptions from `user_push_subscriptions` and delivers the notification using VAPID keys.
9. **Archiving & Pruning**:
   - Successfully processed messages are archived (`pgmq.archive`).
   - Expired/unsubscribed endpoints returning HTTP `404` or `410 Gone` are deleted from `user_push_subscriptions`.

---

## 4. Database Layer & Queue Mechanics

### Sunday Ordinal & Schedule Resolution

The helper functions calculate the exact upcoming Sunday and which ordinal week it represents:

```sql
-- 1. Identify upcoming Sunday
v_upcoming_sunday := date_trunc('week', v_now_manila + interval '1 day')::date + interval '6 days';

-- 2. Compute ordinal Sunday (1 to 5)
v_day_of_month := extract(day from v_upcoming_sunday)::int;
v_ordinal := ((v_day_of_month - 1) / 7) + 1;
```

Slot strings (e.g. `["9AM", "12NN"]` or `"9:00 AM, 12:00 NN"`) are normalized into clean human-readable text:

> _"Reminder: You are scheduled this Sunday at 9:00 AM and 12:00 NN."_

### Idempotency & Duplicate Protection

The `push_reminder_logs` table enforces a composite unique constraint:

```sql
create table if not exists public.push_reminder_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  target_date date not null,
  created_at timestamptz not null default now (),
  constraint push_reminder_logs_user_target_date_key unique (user_id, target_date)
);
```

Before enqueuing, `enqueue_push_reminder` checks:

```sql
insert into
  public.push_reminder_logs (user_id, target_date)
values
  (v_user_id, v_target_date) on conflict do nothing;
```

If `push_reminder_logs` already recorded this `(user_id, target_date)`, the insert is skipped and no duplicate message enters the queue.

### PGMQ Queue Integration

The queue is created via `pgmq.create('push_reminders_queue')`. Two security-definer helper RPCs manage message state:

- `public.pop_push_reminders(batch_size int)`: Reads messages with a 30-second visibility lock (`pgmq.read`).
- `public.archive_push_reminder(message_id bigint)`: Permanently archives the processed message (`pgmq.archive`).

---

## 5. Edge Function Processing (`cron-process-push-reminders`)

### Batch Processing Loop

The edge function continuously pops batches of up to 50 messages until the queue is drained:

```typescript
while (true) {
  const { data: messages, error: popError } = await client.rpc('pop_push_reminders', {
    batch_size: 50,
  });

  if (!messages || messages.length === 0) {
    break; // Queue drained
  }
  // Process batch concurrently...
}
```

### Web Push Payload & Deep Linking

Each notification payload includes the target URL pointing directly to the user's commitments tab:

```typescript
const pushPayload = JSON.stringify({
  title: 'Service Reminder',
  body: notificationMessage,
  url: payload.target_url || payload.url || '/profile?tab=commitments',
});
```

When tapped on a mobile device or browser, the Service Worker opens or focuses the app on `/profile?tab=commitments`.

### Stale Subscription Auto-Pruning

If a user uninstalled the PWA, revoked permissions, or the browser invalidated the push subscription, Web Push servers return `404 Not Found` or `410 Gone`. The edge function aggregates these IDs and batch-deletes them:

```typescript
if (err.statusCode === 404 || err.statusCode === 410) {
  subscriptionsToDelete.add(sub.id);
}
```

---

## 6. Security & Authentication Model

### Dedicated `CRON_ROLE_KEY` Validation

Rather than granting `SUPABASE_SERVICE_ROLE_KEY` to cron tasks, the system uses a dedicated, rotatable secret key `CRON_ROLE_KEY`.

In `supabase/functions/_shared/edge.ts`:

```typescript
if (options.allowCronRole || options.requireCron) {
  const cronKeyHeader = options.req.headers.get('x-cron-key')?.trim();
  const authHeader = options.req.headers.get('authorization')?.trim() ?? '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const providedKey = cronKeyHeader || bearerToken;
  const expectedCronKey = env.cronRoleKey || Deno.env.get('CRON_ROLE_KEY');

  if (expectedCronKey && providedKey && providedKey === expectedCronKey) {
    callerType = 'cron';
  }
}
```

### Vault Storage

In SQL migrations, secrets are retrieved from `vault.decrypted_secrets`:

```sql
select
  decrypted_secret into v_cron_key
from
  vault.decrypted_secrets
where
  name = 'cron_role_key'
limit
  1;
```

This prevents hardcoding API keys in migration files or database function definitions.

---

## 7. Deployment & Configuration Reference

### Secrets Checklist

| Secret Name         | Location                                | Description                                                       |
| :------------------ | :-------------------------------------- | :---------------------------------------------------------------- |
| `CRON_ROLE_KEY`     | Supabase Edge Function Secrets          | Shared secret key for authenticating cron jobs                    |
| `cron_role_key`     | Supabase Database Vault                 | Same shared secret key used by `pg_cron` jobs                     |
| `project_url`       | Supabase Database Vault                 | Base URL of the Supabase project (e.g. `https://xyz.supabase.co`) |
| `VAPID_PUBLIC_KEY`  | Edge Function Secrets & Frontend `.env` | Public VAPID key for web push subscription & signing              |
| `VAPID_PRIVATE_KEY` | Edge Function Secrets                   | Private VAPID key for signing web push payloads                   |

### Deploy Edge Functions

```bash
# Deploy Push Reminders Cron Edge Function
supabase functions deploy cron-process-push-reminders --no-verify-jwt

# Deploy Email Queue Cron Edge Function
supabase functions deploy cron-process-email-queue --no-verify-jwt
```
