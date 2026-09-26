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

## 2. Business Rules & Scoring Philosophy (Plain Language Summary)

The **Attendance Score** measures a volunteer's reliability, schedule fidelity, and extra support given to Sunday church services. It rewards volunteers who fulfill their scheduled commitments, encourages coverage for high-demand services, discourages unannounced absences, and provides an open serving opportunity on 5th Sundays.

### Core Scoring Principles

1. **Honoring Scheduled Commitments (+1.0 Point per Slot)**
   - When a volunteer is scheduled to serve (e.g., 1st Sunday at 9:00 AM) and checks in, they earn **+1.0 point**.
   - Fulfilling regular commitments is the baseline for healthy volunteer engagement.

2. **Unannounced / Missed Absence (-1.0 Point per Slot)**
   - If a volunteer misses a committed service slot without filing an advance excuse, **-1.0 point** is deducted.
   - _Rationale_: No-shows leave ministry teams short-handed on Sundays and disrupt operations.

3. **Filing an Excuse in Advance (-0.5 Point per Slot)**
   - When a volunteer submits an **Excuse Request** before the service date, the penalty is halved to **-0.5 points** (instead of -1.0).
   - _Rationale_: While the team still has a vacancy, advance notice allows ministry leaders to arrange substitutes or rebalance teams.

4. **Walk-In Support on Standard Sundays (1st–4th Sundays)**
   - **9:00 AM or 3:00 PM Services (+0.5 Bonus Point)**: Peak attendance times often need extra volunteer hands. Uncommitted volunteers stepping in earn **+0.5 points**.
   - **12:00 NN Service (0.0 Points / Neutral)**: The mid-day service generally maintains full scheduled coverage. Walk-ins do not increase or decrease the score.

5. **5th Sunday "All-Hands" Walk-Ins (+1.0 Point for Any Service Slot)**
   - On months with a 5th Sunday (calendar days 29–31), any walk-in check-in is rewarded with a full **+1.0 point** across all service slots (9:00 AM, 12:00 NN, 3:00 PM).
   - _Rationale_: 5th Sundays have no fixed annual schedule commitments, encouraging churchwide open volunteer participation.

6. **Fairness Rule: Onboarding Start Date Filtering**
   - All calculations strictly start from the volunteer's registered start date (`users.metadata->>'timestamp'` or `users.created_at`).
   - Any Sundays, scheduled slots, or absences occurring **before** a volunteer joined the organization are completely excluded so new volunteers are never penalized for past dates.

---

### The Attendance Score Formula

$$\text{Attendance Score} = \text{attended} - \Big((1.0 \times \text{unexcused}) + (0.5 \times \text{excused})\Big) + (0.5 \times \text{wi\_9am\_3pm}) + (1.0 \times \text{wi\_5th\_sunday})$$

---

### Quick Reference Points Matrix

| Volunteer Scenario / Action                       | Score Impact | Business Rationale                                                 |
| :------------------------------------------------ | :----------: | :----------------------------------------------------------------- |
| **Attended Scheduled Commitment**                 |  **`+1.0`**  | Fulfilling regular Sunday ministry schedule                        |
| **Missed Commitment without Excuse**              |  **`-1.0`**  | Unannounced absence leaving ministry team short-handed             |
| **Missed Commitment with Approved Excuse**        |  **`-0.5`**  | Advance notice mitigating Sunday scheduling gaps                   |
| **Walk-In (9:00 AM or 3:00 PM on 1st–4th Sun)**   |  **`+0.5`**  | Volunteering extra support during peak services                    |
| **Walk-In (12:00 NN on 1st–4th Sun)**             |  **`0.0`**   | Neutral extra support during standard rostered service             |
| **Walk-In Any Service on 5th Sunday (Day 29–31)** |  **`+1.0`**  | Rewarding 5th Sunday open volunteer participation across all slots |

---

### Real-World Calculation Examples

- **Scenario A — Perfect Regular Service**:
  - Committed to 4 Sunday services in a month. Attends all 4.
  - **Score**: $4 \times (+1.0) = \mathbf{+4.0}$

- **Scenario B — Responsible Absence + Extra Walk-In**:
  - Committed to 4 services. Attends 3, files an excuse for 1 missed service, and walks in to assist at 9:00 AM on another Sunday.
  - **Score**: $(3 \times 1.0) - (1 \times 0.5) + (1 \times 0.5) = \mathbf{+3.0}$

- **Scenario C — Unannounced Absence Recovered with 5th Sunday**:
  - Committed to 4 services. Attends 3, misses 1 without an excuse ($-1.0$), but walks in on the 5th Sunday ($+1.0$).
  - **Score**: $(3 \times 1.0) - (1 \times 1.0) + (1 \times 1.0) = \mathbf{+3.0}$

---

## 3. Database RPC (`get_commitment_dashboard_stats`)

The RPC is declared in `supabase/migrations/20260926123500_add_calculate_attendance_score_function.sql` with the following signature:

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
  avatar_object_key text,
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
    ├── Extracts u_start_date: metadata->>'timestamp' parsed to date, falling back to created_at::date
    └── Filters active users by search text (name, nickname, member_id), role, category
 3. excused_requests CTE
    └── Joins registrations & registration_answers for event_fields:
        - request_date
        - services (e.g., '9AM', '12NN', '3PM', 'All Services')
 4. user_stats CTE
    ├── Filters all subqueries to ignore calculations prior to volunteer's start_date (date >= fu.u_start_date)
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

## 4. Sunday Ordinal & Commitment Snapshot Resolution

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

### D. Start Date Resolution & Pre-Start-Date Filtering

Each volunteer has a computed `start_date` determined from their onboarding metadata:

1. If `users.metadata->>'timestamp'` contains a valid date string (`YYYY-MM-DD`), that date is extracted as the volunteer's `start_date`.
2. Otherwise, `users.created_at::date` is used as a fallback.

**Pre-Start-Date Filtering Rule**:
All metrics (`total_committed`, `total_attended`, `total_absences`, `total_excused`, `wi_9am_3pm`, and `wi_12nn`) explicitly enforce `sunday_date >= fu.u_start_date` (or `service_date >= fu.u_start_date`). Any Sundays, scheduled slots, check-ins, or absences occurring **prior to** the volunteer's start date are completely ignored in calculations.

---

## 5. Metrics & Technical Scoring Formula

### Metric Definitions

| Metric              | Column Name     | Calculation Logic                                                                                                           | Description                                        |
| :------------------ | :-------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| **Committed**       | `committed`     | Count of `(sunday_date, time_slot)` where volunteer is committed.                                                           | Total service slots scheduled in timeframe.        |
| **Attended**        | `attended`      | Count of `service_attendance` check-ins where `is_walk_in = false`.                                                         | Committed service slots checked in.                |
| **Absences**        | `absences`      | Committed slots on past/present Sundays (`sunday_date <= current_date`) with no check-in and **no** excused request.        | Missed committed commitments.                      |
| **Excused**         | `excused`       | Committed slots on past/present Sundays (`sunday_date <= current_date`) with no check-in and an active **excused request**. | Scheduled commitments excused in advance.          |
| **Walk-in 9AM/3PM** | `wi_9am_3pm`    | Count of `service_attendance` check-ins on 1st–4th Sundays where `is_walk_in = true` and `time_slot in ('9AM', '3PM')`.     | Additional uncommitted support in peak services.   |
| **Walk-in 12NN**    | `wi_12nn`       | Count of `service_attendance` check-ins on 1st–4th Sundays where `is_walk_in = true` and `time_slot = '12NN'`.              | Additional uncommitted support in mid-day service. |
| **Walk-in 5th Sun** | `wi_5th_sunday` | Count of `service_attendance` check-ins on 5th Sunday (day $\ge 29$) where `is_walk_in = true` (all slots).                 | 5th Sunday open walk-in service support.           |

### Attendance Scoring Formula

$$\text{Attendance Score} = \text{attended} - \Big((1.0 \times \text{unexcused}) + (0.5 \times \text{excused})\Big) + (0.5 \times \text{wi\_9am\_3pm}) + (1.0 \times \text{wi\_5th\_sunday})$$

> **Note on Column Mapping**:
> In the database schema and query results, the column `absences` represents **Unexcused Absences** (committed slots on past/present Sundays with no check-in and **no** excuse filed).
> Thus, $\text{unexcused} \equiv \text{absences}$.

- **$+1.0$** per committed slot attended (`attended`)
- **$-1.0$** per unexcused absence (`unexcused` / `absences`)
- **$-0.5$** per excused absence (`excused`)
- **$+0.5$** per 9AM or 3PM walk-in check-in on 1st–4th Sundays (`wi_9am_3pm`)
- **$0.0$** for 12NN walk-ins on 1st–4th Sundays (`wi_12nn` — neutral / no score change)
- **$+1.0$** for ANY walk-in slot on 5th Sunday (`wi_5th_sunday`)

The scoring formula is centralized in:

- **Database (PostgreSQL Function)**: `public.calculate_attendance_score(p_attended, p_absences, p_excused, p_wi_9am_3pm, p_wi_5th_sunday)` used by `get_commitment_dashboard_stats`.
- **Frontend (TypeScript Helper)**: `calculateAttendanceScore({ attended, absences, excused, wi9or3, wi5th })` in `src/lib/domain/services/service-commitment-scoring.ts` used by modal breakdowns.

---

## 6. Excused Absence Resolution

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

## 7. Frontend Features & UX Design

- **Search Debouncing**: The name / member ID search filter is debounced at 300ms (`TIMING.searchDebounceMs`) in `AdminServiceAttendanceCommitmentPage.tsx` to minimize redundant network queries while keeping input typing fluid.
- **Client-Side Sorting**: Table sorting in `VolunteerListTable.tsx` is executed on the client side with `useMemo`, allowing instant toggling of ascending/descending sorts across all 11 columns with fallback secondary sorting by volunteer name.
- **Infinite Scrolling**: Paginated data loading via `useInfiniteScrollTrigger` and React Query `useInfiniteQuery`.
- **Summary Cards & Charts**: Aggregated metrics and top volunteer rankings computed dynamically from loaded stats.
