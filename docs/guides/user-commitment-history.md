# User Commitment History & Snapshotting Architecture

This document describes the design, database schema, security model, and frontend integration for tracking volunteer Sunday service commitment changes over time.

---

## 1. Overview & Problem Solved

### The Problem

Members and volunteers specify their Sunday service commitments (e.g., attending 9AM on 1st and 3rd Sundays) in `users.metadata`. Over time, a volunteer's commitments can change (e.g., switching from 9AM to 12NN, or dropping a Sunday).

If the profile attendance history UI evaluated past attendance records using only the volunteer's _current_ metadata:

- An attendance from 3 months ago (when they were committed to 9AM) would be falsely flagged as **Unscheduled** if their current commitment is 12NN.
- Their new commitment (12NN) would be falsely marked as **Missed Committed** for that past Sunday.

### The Solution

The system captures an audit snapshot of commitment changes in the `user_commitment_history` table whenever a user's commitment metadata is updated. Each snapshot is stamped with an `effective_date` pointing to the nearest upcoming Sunday, allowing the UI to reconstruct what the volunteer was committed to on any specific historical Sunday.

---

## 2. Database Schema

The table is defined in migration `20260920100000_add_user_commitment_history.sql`:

```sql
create table public.user_commitment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  effective_date date not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_commitment_history_user_id_idx on public.user_commitment_history (user_id);
create index user_commitment_history_effective_date_idx on public.user_commitment_history (effective_date);
```

### Fields

| Field            | Type          | Description                                                           |
| ---------------- | ------------- | --------------------------------------------------------------------- |
| `id`             | `uuid`        | Primary key (`gen_random_uuid()`).                                    |
| `user_id`        | `uuid`        | Foreign key referencing `public.users(id)` with `on delete cascade`.  |
| `effective_date` | `date`        | The Sunday starting from which this commitment configuration applies. |
| `metadata`       | `jsonb`       | The isolated commitment JSON (`first_sunday` ... `fifth_sunday`).     |
| `created_at`     | `timestamptz` | Timestamp when the snapshot was recorded.                             |

---

## 3. Snapshot Lifecycle & Database Trigger

Snapshots are created automatically by the `users_snapshot_commitment_metadata` trigger on `public.users`.

```
                  UPDATE on public.users
                            │
                            ▼
           snapshot_user_commitment_metadata()
                            │
               Extract commitment keys only
            (first_sunday ... fifth_sunday)
                            │
                            ▼
          old_commitments != new_commitments?
                     /             \
                   No               Yes
                   /                 \
               Do nothing      Existing history?
                                 /          \
                               No            Yes
                               /              \
                    Insert baseline snapshot   │
                    (effective 2000-01-01)     │
                               \              /
                                ▼            ▼
                        Calculate nearest upcoming Sunday
                                      │
                                      ▼
                        Insert new commitment snapshot
```

### Change Detection Guard

Updates that only touch non-commitment fields (e.g. `first_name`, `email`, or other metadata keys) are filtered out:

```sql
old_commitments := jsonb_build_object(
  'first_sunday', old.metadata->'first_sunday',
  'second_sunday', old.metadata->'second_sunday',
  'third_sunday', old.metadata->'third_sunday',
  'fourth_sunday', old.metadata->'fourth_sunday',
  'fifth_sunday', old.metadata->'fifth_sunday'
);

new_commitments := jsonb_build_object(
  'first_sunday', new.metadata->'first_sunday',
  'second_sunday', new.metadata->'second_sunday',
  'third_sunday', new.metadata->'third_sunday',
  'fourth_sunday', new.metadata->'fourth_sunday',
  'fifth_sunday', new.metadata->'fifth_sunday'
);

if old_commitments is distinct from new_commitments then
  ...
end if;
```

### Baseline Creation

If a user changes their commitment for the first time and has no previous records in `user_commitment_history`, a baseline snapshot using `old_commitments` is inserted with `effective_date = '2000-01-01'::date`. This guarantees that all historical dates preceding this first change have an applicable commitment record.

### Nearest Upcoming Sunday Calculation

The new commitment becomes effective on the nearest upcoming Sunday, calculated via `get_nearest_upcoming_sunday(current_date)`:

```sql
create or replace function public.get_nearest_upcoming_sunday (base_date date) returns date as $$
declare
  day_of_week integer;
  days_to_add integer;
begin
  day_of_week := extract(dow from base_date);
  if day_of_week = 0 then
    days_to_add := 0;
  else
    days_to_add := 7 - day_of_week;
  end if;
  return base_date + days_to_add;
end;
$$ language plpgsql immutable;
```

---

## 4. Row Level Security & Function Privileges

Row Level Security is enabled on `user_commitment_history`.

### Trigger Execution Context (`SECURITY DEFINER`)

Because regular authenticated sessions and administrators update `public.users` directly, the trigger function must run with elevated privileges to insert internal audit records:

```sql
create or replace function public.snapshot_user_commitment_metadata () returns trigger
language plpgsql
security definer
set search_path = public as $$
```

Without `security definer`, PostgreSQL evaluates RLS against the active session role during the trigger's `INSERT`, resulting in error `42501` (`new row violates row-level security policy`).

### RLS Policies

1. **Admin Readers**:

   ```sql
   create policy "admin viewers can read user_commitment_history" on public.user_commitment_history for
   select
     to authenticated using (public.is_admin_viewer ());
   ```

2. **Self Member Readers** (Session email matching via `auth.jwt()`):

   ```sql
   create policy "users can read their own user_commitment_history" on public.user_commitment_history for
   select
     to authenticated using (
       exists (
         select
           1
         from
           public.users u
         where
           u.id = user_commitment_history.user_id
           and u.email is not null
           and lower(u.email) = lower(auth.jwt () - > > 'email')
       )
     );
   ```

3. **Service Role**:
   ```sql
   create policy "service role full access to user_commitment_history" on public.user_commitment_history for all to service_role using (true)
   with
     check (true);
   ```

---

## 5. UI Integration

### Query Hook (`src/hooks/domain/services/queries/useUserCommitmentHistoryQuery.ts`)

Fetches all historical snapshots for a given user ID, ordered by effective date descending:

```ts
export function useUserCommitmentHistoryQuery(userId: string) {
  return useQuery({
    queryKey: ['user_commitment_history', userId],
    queryFn: async (): Promise<UserCommitmentSnapshot[]> => {
      const { data, error } = await supabase
        .from('user_commitment_history')
        .select('*')
        .eq('user_id', userId)
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as UserCommitmentSnapshot[]) || [];
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Snapshot Resolution (`src/lib/domain/services/service-matrix.ts`)

When rendering the matrix grid for a given month in `ServiceAttendanceHistoryTab.tsx`, each Sunday calculates which commitment was active using `resolveMetadataForDate`:

```ts
export function resolveMetadataForDate(
  targetDate: string,
  currentMetadata: Record<string, string> | null | undefined,
  snapshots: UserCommitmentSnapshot[],
): Record<string, string> | null | undefined {
  // snapshots are sorted by effective_date descending
  const applicableSnapshot = snapshots.find((s) => s.effective_date <= targetDate);
  if (applicableSnapshot) {
    return applicableSnapshot.metadata as Record<string, string>;
  }
  // Fall back to current metadata if before any recorded snapshot
  return currentMetadata;
}
```

### Attendance Alignment Statuses

Once the active commitment metadata is resolved for that Sunday, `computeMatrixGrid` compares recorded check-ins against committed slots:

| Status Badge                                  | Condition                                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Committed** (`attended_committed`)          | Member checked into a time slot they were scheduled for on that date.                                           |
| **Unscheduled** (`attended_unscheduled`)      | Member checked into a time slot they were NOT scheduled for.                                                    |
| **Missed Committed** (`missed_committed`)     | The Sunday date is in the past (`sunday.dateStr < todayStr`), the slot was committed, but no check-in occurred. |
| **Upcoming Committed** (`upcoming_committed`) | Future Sunday commitment where service has not yet taken place.                                                 |
| **Off Schedule** (`off_schedule`)             | Not committed and no check-in recorded.                                                                         |
| **Not Applicable** (`not_applicable`)         | Sunday does not occur in that month (e.g. 5th Sunday in a 4-Sunday month).                                      |
