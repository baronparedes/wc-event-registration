# Volunteer Commitment Dashboard Computation Guide

This document details the architectural design, database calculations, scoring formula, excuse resolution, and frontend features powering the **Volunteer Commitment Dashboard** (`/admin/services/attendance/commitment`).

---

## 1. Overview & Architecture

The Volunteer Commitment Dashboard provides administrators with quantitative metrics on volunteer fidelity, attendance performance, missed commitments, excused absences, and walk-in support across customizable timeframes (Q1, Q2, Q3, Q4, YTD).

### Architecture Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│             Frontend (/admin/services/attendance/commitment)           │
│               AdminServiceAttendanceCommitmentPage.tsx                 │
│  - Timeframe Filter: Q1 | Q2 | Q3 | Q4 | YTD                           │
│  - Search Query (debounced 300ms via TIMING.searchDebounceMs)          │
│  - Client-side Multi-column Sorting (VolunteerListTable.tsx)           │
│  - Infinite Scrolling (useInfiniteScrollTrigger)                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│     Domain Hook (useCommitmentDashboardStatsQuery.ts)                  │
│  - React Query useInfiniteQuery                                        │
│  - Direct Supabase RPC invocation                                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│     Supabase RPC (public.get_commitment_dashboard_stats)               │
│  - SECURITY DEFINER with search_path = public                          │
│  - Access Guard: public.is_admin_viewer()                              │
│  - Pre-computes Sunday series in timeframe                             │
│  - Resolves historical commitment snapshots per Sunday                 │
│  - Correlates excuse request submissions                               │
│  - Evaluates check-ins & computes attendance scores                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  service_attendance  │  │     public.users     │  │user_commitment_history│
│  - service_date      │  │  - is_active = true  │  │  - effective_date    │
│  - time_slot         │  │  - metadata          │  │  - metadata snapshot │
│  - is_walk_in        │  │  - role / category   │  └──────────────────────┘
└──────────────────────┘  └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  excuse_requests     │
                          │  (registrations &    │
                          │   registration_      │
                          │   answers)           │
                          └──────────────────────┘
```

---

## 2. Database RPC (`get_commitment_dashboard_stats`)

The RPC is declared in `supabase/migrations/20260924193000_add_get_commitment_dashboard_stats.sql` with the following signature:

```sql
create
or replace function public.get_commitment_dashboard_stats (
  p_start_date date,
  p_end_date date,
  p_excuse_event_id uuid default null,
  p_search_query text default null,
  p_role text default null,
  p_category text default null,
  p_page integer default 1,
  p_page_size integer default 500
) returns table (
  user_id uuid,
  member_id text,
  full_name text,
  nickname text,
  email text,
  role text,
  category text,
  start_date date,
  committed bigint,
  attended bigint,
  absences bigint,
  excused bigint,
  wi_9am_3pm bigint,
  wi_12nn bigint,
  attendance_score numeric,
  total_count bigint
) language plpgsql security definer
```

### Execution Pipeline & CTE Breakdown

```
 1. generate_series (p_start_date -> p_end_date)
    └── Filter extract(dow from d) = 0 into v_sundays date[]
 2. filtered_users CTE
    └── Filters active users by search text (name, nickname, member_id), role, category
 3. excused_requests CTE
    └── Joins registrations & registration_answers for event_fields:
        - request_date
        - services (e.g., '9AM', '12NN', '3PM', 'All Services')
 4. user_stats CTE
    ├── Sunday ordinal mapping (1st -> first_sunday ... 5th -> fifth_sunday)
    ├── Commitment resolution (user_commitment_history vs metadata)
    ├── Cross-evaluation over ('9AM', '12NN', '3PM') time slots
    ├── Counts: total_committed, total_attended, total_absences, total_excused
    └── Counts: wi_9am_3pm, wi_12nn (walk-ins)
 5. scored_users CTE
    └── Evaluates net attendance_score formula
 6. Output Query
    └── Joins total_count_query and applies LIMIT p_page_size OFFSET v_offset
```

---

## 3. Sunday Ordinal & Commitment Snapshot Resolution

### A. Monthly Sunday Ordinal Calculation

Each Sunday date `s.sunday_date` is mapped to its 1st–5th ordinal within its respective month:

```sql
select extract(day from s.sunday_date)::integer / 7 + case when extract(day from s.sunday_date)::integer % 7 > 0 then 1 else 0 end as ordinal
```

- Day 1–7 $\rightarrow$ `first_sunday`
- Day 8–14 $\rightarrow$ `second_sunday`
- Day 15–21 $\rightarrow$ `third_sunday`
- Day 22–28 $\rightarrow$ `fourth_sunday`
- Day 29–31 $\rightarrow$ `fifth_sunday`

### B. Point-in-Time Commitment Snapshot

Commitments evolve over time as volunteers update their Sunday availability. When a volunteer updates their Sunday availability, database triggers snapshot the prior commitment into `public.user_commitment_history`.

To evaluate commitments accurately for any historical Sunday:

```sql
where
  coalesce(
    (
      select
        sub_ch.metadata
      from
        public.user_commitment_history sub_ch
      where
        sub_ch.user_id = fu.user_id
        and sub_ch.effective_date <= s.sunday_date
      order by
        sub_ch.effective_date desc
      limit
        1
    ),
    fu.metadata
  ) - > > ckey.key ilike ('%' || ts.time_slot || '%')
```

1. **Snapshot Selection**: Finds the latest snapshot where `effective_date <= s.sunday_date`.
2. **Object Coalesce**: Coalesces the whole `metadata` JSON object before extracting `->>ckey.key`. This ensures that if a snapshot exists and explicitly sets a Sunday to `null` (not committed), it will respect the snapshot rather than falling back to current metadata.
3. **Fallback**: If no snapshot exists prior to that Sunday, it uses the user's current baseline `metadata`.
4. **Slot Matching**: Validates whether the comma-separated availability string (e.g. `'9AM'`, `'9AM, 12NN'`, `'3PM'`) includes the target time slot `ts.time_slot`.

### C. Multiple Snapshots Within a Quarter / Timeframe

When a volunteer changes their commitments multiple times within the evaluated period (for example, 3 changes across Q1), the query **does not** apply a single flat snapshot to the whole quarter. Instead, it computes metrics dynamically **Sunday-by-Sunday**:

#### Example Scenario in Q1 (Jan 1 – Mar 31):

| Snapshot       | Effective Date | Committed Sundays & Slots                  |
| :------------- | :------------- | :----------------------------------------- |
| **Snapshot 1** | `2026-01-01`   | 1st Sunday: `9AM`, 2nd Sunday: `9AM`       |
| **Snapshot 2** | `2026-02-01`   | 1st Sunday: `9AM, 12NN`, 2nd Sunday: `9AM` |
| **Snapshot 3** | `2026-03-01`   | 1st Sunday: `12NN`, 2nd Sunday: _None_     |

#### Point-in-Time Resolution Timeline:

```
 Jan 1              Feb 1              Mar 1             Mar 31
───┬──────────────────┬──────────────────┬──────────────────►
   │  [Snapshot 1]    │  [Snapshot 2]    │  [Snapshot 3]
   │  1st Sun: 9AM    │  1st Sun: 9AM,12 │  1st Sun: 12NN
   │  2nd Sun: 9AM    │  2nd Sun: 9AM    │  2nd Sun: None
   │                  │                  │
   ▼                  ▼                  ▼
Evaluated for       Evaluated for      Evaluated for
Jan Sundays         Feb Sundays        Mar Sundays
```

- **January Sundays (e.g., Jan 4, Jan 11)**: `sub_ch.effective_date <= '2026-01-04'` matches Snapshot 1 (effective Jan 1). January Sundays are evaluated against Snapshot 1 (1 slot on 1st Sun, 1 slot on 2nd Sun).
- **February Sundays (e.g., Feb 1, Feb 8)**: `sub_ch.effective_date <= '2026-02-01'` matches Snapshot 1 and Snapshot 2. Due to `order by effective_date desc limit 1`, Snapshot 2 is selected. February Sundays are evaluated against Snapshot 2 (2 slots on 1st Sun, 1 slot on 2nd Sun).
- **March Sundays (e.g., Mar 1, Mar 8)**: `sub_ch.effective_date <= '2026-03-01'` matches Snapshots 1, 2, and 3. `order by effective_date desc limit 1` selects Snapshot 3. March Sundays are evaluated against Snapshot 3 (1 slot on 1st Sun, 0 slots on 2nd Sun).

#### Cumulative Dashboard Calculation:

- **`committed`**: Sum of active slots on each Sunday according to the snapshot active on that specific Sunday ($\text{Jan (2)} + \text{Feb (3)} + \text{Mar (1)} = 6$).
- **`absences` & `excused`**: Each Sunday's attendance is compared exclusively against the commitment active on that specific Sunday. Future Sundays that have not occurred yet (`sunday_date > current_date` in Manila time) are excluded to prevent premature penalties.

---

## 4. Metrics & Scoring Formula

### Metric Definitions

| Metric              | Column Name  | Calculation Logic                                                                                                           | Description                                        |
| :------------------ | :----------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| **Committed**       | `committed`  | Count of `(sunday_date, time_slot)` where volunteer is committed.                                                           | Total service slots scheduled in timeframe.        |
| **Attended**        | `attended`   | Count of `service_attendance` check-ins where `is_walk_in = false`.                                                         | Committed service slots checked in.                |
| **Absences**        | `absences`   | Committed slots on past/present Sundays (`sunday_date <= current_date`) with no check-in and **no** excused request.        | Missed committed commitments.                      |
| **Excused**         | `excused`    | Committed slots on past/present Sundays (`sunday_date <= current_date`) with no check-in and an active **excused request**. | Scheduled commitments excused in advance.          |
| **Walk-in 9AM/3PM** | `wi_9am_3pm` | Count of `service_attendance` check-ins where `is_walk_in = true` and `time_slot in ('9AM', '3PM')`.                        | Additional uncommitted support in peak services.   |
| **Walk-in 12NN**    | `wi_12nn`    | Count of `service_attendance` check-ins where `is_walk_in = true` and `time_slot = '12NN'`.                                 | Additional uncommitted support in mid-day service. |

### Attendance Scoring Formula

$$\text{Attendance Score} = \text{attended} - \text{absences} - (0.5 \times \text{excused}) + (0.5 \times \text{wi\_9am\_3pm})$$

- **$+1.0$** per committed slot attended
- **$-1.0$** per unexcused absence
- **$-0.5$** per excused absence
- **$+0.5$** per 9AM or 3PM walk-in check-in
- **$0.0$** for 12NN walk-ins (neutral / no score penalty or bonus)

---

## 5. Excused Absence Resolution

Excuses are submitted via event registrations (typically `VITE_EXCUSE_REQUEST_EVENT_ID`). The query extracts:

1. `request_date`: The specific date for which the volunteer requested an excuse.
2. `services`: The specific service slots requested (e.g. `'9AM'`, `'12NN'`, `'3PM'`, `'All Services'`).

```sql
and exists (
  select 1
  from excused_requests er
  where er.user_id = fu.user_id
    and er.request_date_str like (s.sunday_date::text || '%')
    and (
      er.services is null
      or trim(er.services) = ''
      or er.services ilike ('%' || ts.time_slot || '%')
      or er.services ilike '%all%'
    )
)
```

---

## 6. Frontend Features & UX Design

- **Search Debouncing**: The name / member ID search filter is debounced at 300ms (`TIMING.searchDebounceMs`) in `AdminServiceAttendanceCommitmentPage.tsx` to minimize redundant network queries while keeping input typing fluid.
- **Client-Side Sorting**: Table sorting in `VolunteerListTable.tsx` is executed on the client side with `useMemo`, allowing instant toggling of ascending/descending sorts across all 11 columns with fallback secondary sorting by volunteer name.
- **Infinite Scrolling**: Paginated data loading via `useInfiniteScrollTrigger` and React Query `useInfiniteQuery`.
- **Summary Cards & Charts**: Aggregated metrics and top volunteer rankings computed dynamically from loaded stats.
