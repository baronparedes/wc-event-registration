# Service Attendance Dashboard Computation Guide

This document details the architectural design, database calculations, and frontend filter rules powering the **Services Dashboard** (`/admin/services`). Use this guide to understand how volunteer commitments, attendance, turn-up rates, late overrides, walk-ins, and role breakdowns are calculated across Sunday, Month, and Annual views.

---

## 1. Overview & Architecture

The Services Dashboard provides real-time and historical visibility into Sunday service attendance across 3 standard time slots: **9AM**, **12NN**, and **3PM**.

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (/admin/services)                 │
│               AdminServicesPage.tsx                     │
│  - Filter Pills: Sunday | Month | Annual                │
│  - Boundary Clamping (Min Year 2025, Max Prev Sunday)   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│     Domain Hook (useServiceDashboardQuery.ts)           │
│  - Query Key: ['service-dashboard-stats', filters]      │
│  - Slot Normalization ('9:00 AM' -> '9AM')              │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│     Supabase RPC (get_service_dashboard_stats)          │
│  - Security Definer with search_path = public           │
│  - Generates series of Sundays in selected timeframe    │
│  - Evaluates point-in-time commitments & check-ins      │
└───────────────────────────┬─────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
┌──────────────────────┐            ┌──────────────────────┐
│  service_attendance  │            │     public.users     │
│  - service_date      │            │  - is_active = true  │
│  - time_slot         │            │  - metadata          │
│  - is_walk_in        │            │  - role              │
│  - is_override       │            └──────────┬───────────┘
└──────────────────────┘                       │
                                               ▼
                                    ┌──────────────────────┐
                                    │user_commitment_history│
                                    │  - effective_date    │
                                    │  - metadata snapshot │
                                    └──────────────────────┘
```

---

## 2. Timeframe & Sunday Resolution

The dashboard operates in three filter modes, each generating an array of Sundays (`v_sundays date[]`):

| Filter Mode | Input Parameters    | Date Range Resolution                                                  | Sundays Evaluated                           |
| :---------- | :------------------ | :--------------------------------------------------------------------- | :------------------------------------------ |
| **Sunday**  | `p_sunday_date`     | `start = p_sunday_date`, `end = p_sunday_date`                         | Single selected Sunday                      |
| **Month**   | `p_year`, `p_month` | `start = make_date(p_year, p_month, 1)`<br>`end = last_day_of_month`   | All Sundays where `extract(dow from d) = 0` |
| **Annual**  | `p_year`            | `start = make_date(p_year, 1, 1)`<br>`end = make_date(p_year, 12, 31)` | All Sundays in the year                     |

### Sunday Ordinal Calculation

For every Sunday in `v_sundays`, the system determines its ordinal position within the month to resolve the user's scheduled commitment:

```sql
extract(day from s.sunday_date)::integer / 7
  + case when extract(day from s.sunday_date)::integer % 7 > 0 then 1 else 0 end
```

This maps to the corresponding commitment metadata key:

- Day 1–7 $\rightarrow$ `first_sunday`
- Day 8–14 $\rightarrow$ `second_sunday`
- Day 15–21 $\rightarrow$ `third_sunday`
- Day 22–28 $\rightarrow$ `fourth_sunday`
- Day 29–31 $\rightarrow$ `fifth_sunday`

---

## 3. Metrics Computation Rules

### 1. Committed Volunteers

The number of active volunteers who were scheduled to serve during that service slot.

- **Eligibility**: Active accounts only (`public.users.is_active = true`).
- **Point-in-Time Historical Accuracy**:
  Commitments change over time. To avoid skewing past reports, the RPC queries `public.user_commitment_history` for the latest snapshot effective on or before that Sunday:
  ```sql
  coalesce(
    (
      select
        metadata - > > es.ckey
      from
        public.user_commitment_history sub_ch
      where
        sub_ch.user_id = u.id
        and sub_ch.effective_date <= es.sunday_date
      order by
        sub_ch.effective_date desc
      limit
        1
    ),
    u.metadata - > > es.ckey
  ) ilike '%' || ts.time_slot || '%'
  ```
  _If no historical snapshot exists, it falls back to current `users.metadata`._
- **Aggregation**: For Month and Annual views, commitments are summed across all Sundays in the timeframe:
  $$\text{Total Committed} = \sum_{\text{Sundays}} \text{Committed Count}$$

### 2. Present (Attended) Volunteers

Volunteers who attended their committed service slot.

- **Source**: `public.service_attendance` joined with `public.users`.
- **Condition**:
  - `sa.service_date = any(v_sundays)`
  - `sa.time_slot in ('9AM', '12NN', '3PM')`
  - `sa.is_walk_in = false` (scheduled volunteers only)
- **Calculation**:
  ```sql
  count(user_id) filter (
    where
      is_walk_in = false
  ) as total_present
  ```

### 3. Turn-Up Rate (%)

Percentage of committed volunteers who were present for service.

- **Formula**:
  $$\text{Turn-Up Rate} = \begin{cases} 0\% & \text{if Committed} = 0 \\ \operatorname{round}\left(\frac{\text{Present}}{\text{Committed}} \times 100\right) & \text{if Committed} > 0 \end{cases}$$
- **Threshold Alert**:
  - Turn-up rates **$< 50\%$** trigger destructive / danger visual indicators (`border-danger/30 bg-danger/5` and red badges).
  - Turn-up rates **$\ge 50\%$** display standard brand styling.

### 4. Late / Tardy Check-Ins

Volunteers whose attendance was recorded with a supervisor override (typically due to late check-in past the scheduled window).

- **Condition**: `sa.is_override = true`.
- **Calculation**:
  ```sql
  count(user_id) filter (
    where
      is_override = true
  ) as total_late_tardy
  ```

### 5. Total Walk-Ins

Volunteers who served during a service slot they were not originally scheduled for.

- **Condition**: `sa.is_walk_in = true`.
- **Calculation**:
  ```sql
  count(user_id) filter (
    where
      is_walk_in = true
  ) as total_walk_ins
  ```

### 6. Attendance by Role

Breakdown of attended volunteers per primary role across service time slots.

- **Primary Role Resolution**:
  A volunteer's role may contain composite or slash-separated assignments (e.g. `Usher / Greeter`). The primary role is extracted as the first segment:
  ```sql
  split_part (
    coalesce(nullif(trim(u.role), ''), u.metadata - > > 'role'),
    '/',
    1
  ) as primary_role
  ```
- **Grouping**: Non-walk-in attendees grouped by primary role and time slot (`role_data`).
- **Display**: Rendered in the bottom `Attendance by Role` section card with individual role totals and per-slot counts.

---

## 4. UI Filter Rules & Boundaries

To prevent querying incomplete or future data and maintain high performance, the UI enforces strict boundaries:

1. **Max Sunday = Previous Sunday**:
   - Initial load anchors to `getNearestPreviousSunday()`.
   - If accessed on Sunday, it defaults to today.
   - If accessed Monday through Saturday, it defaults to the preceding Sunday.
   - The Next Sunday button (`›`) is disabled when `selectedSunday === maxSunday`.
   - Dropdown options do not list future Sundays.

2. **Max Month = Current Month**:
   - In Month view for the current year, months beyond the current calendar month are excluded from the dropdown.
   - Next Month button (`›`) is disabled when `selectedYear === currentYear && selectedMonth >= currentMonth`.
   - Changing the Year dropdown automatically clamps `selectedMonth` to `currentMonth` when transitioning to the current year.

3. **Min Year = 2025**:
   - `MIN_YEAR = 2025` is enforced across all filter modes.
   - Previous Year button (`‹`) is disabled at 2025.
   - Previous Sunday button (`‹`) is disabled at `2025-01-01`.
   - Year dropdowns list years down to `2025`.

---

## 5. Summary Response Schema

The `public.get_service_dashboard_stats` RPC returns JSON conforming to this schema:

```json
{
  "time_slots": {
    "9AM": {
      "committed": 42,
      "present": 38,
      "walk_ins": 4,
      "late_tardy": 2,
      "roles": {
        "Usher": 15,
        "Greeter": 8,
        "Production": 15
      }
    },
    "12NN": {
      "committed": 35,
      "present": 30,
      "walk_ins": 2,
      "late_tardy": 1,
      "roles": {
        "Usher": 12,
        "Greeter": 6,
        "Production": 12
      }
    },
    "3PM": {
      "committed": 28,
      "present": 25,
      "walk_ins": 3,
      "late_tardy": 0,
      "roles": {
        "Usher": 10,
        "Greeter": 5,
        "Production": 10
      }
    }
  },
  "roles": ["Greeter", "Production", "Usher"]
}
```
