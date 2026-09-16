# Plan: Recurring Event Check-In System

## TL;DR

A new, fully separate domain for recurring events (first iteration: every Sunday at 9am / 12nn / 3pm). Members check in via a kiosk by scanning their member ID; the system auto-resolves the active timeslot, reads their metadata commitment for that Sunday ordinal (1st–5th), and assigns them to a role-based area slot (like cinema seating). Admin manages a recurring event template (timeslots + role areas + slots) and views per-occurrence attendance. Named "recurring-event" domain to allow future expansion (bi-weekly, Mondays, etc.).

---

## Data Model (5 new tables)

| Table                         | Purpose                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recurring_event_templates`   | `schedule_type` (`'weekly_sunday'` now; extensible), timeslots jsonb, name, `is_archived` bool (soft-delete; multiple templates can be active simultaneously) |
| `recurring_event_areas`       | Role → area mapping per template (`role` text, `name` text, `display_order`)                                                                                  |
| `recurring_event_area_slots`  | Individual posts within an area ("Gate A", "Table 3"); FK to area                                                                                             |
| `recurring_event_occurrences` | One row per template+date; `unique(template_id, occurrence_date)`; stores `occurrence_ordinal`, `status`                                                      |
| `recurring_event_check_ins`   | One row per member+timeslot+occurrence; `area_slot_id` nullable; `is_committed` bool; `unique(occurrence_id, user_id, timeslot)`                              |

**Template timeslots shape:**

```json
[{ "label": "9AM", "hour": 9, "minute": 0, "opens_before_min": 60, "closes_after_min": 30 }]
```

---

## Commitment Resolution (pure domain helpers)

In `src/lib/domain/recurring-events/transforms.ts`:

- `getSundayOrdinal(date)` — nth Sunday of month (Sunday-specific this iteration)
- `resolveCommittedTimeslots(metadata, ordinal)` — reads `metadata['third_sunday']` → parses `"9AM, 12NN, 3PM"` → `['9AM', '12NN', '3PM']`
- `resolveActiveTimeslot(nowIso, occurrenceDate, timeslots)` — returns active timeslot label or null; hour/minute in Manila time (UTC+8)

---

## Phases

### Phase 1 — DB & Migrations

1. Migration: 5 new tables with constraints and indexes
2. RLS: `admin`/`super_admin`/`kiosk` write; `admin`/`super_admin`/`slod` read
3. Grant privileges

### Phase 2 — Domain Layer (`src/lib/domain/recurring-events/`)

`types.ts`, `schemas.ts`, `transforms.ts`, `index.ts`

### Phase 3 — Edge Functions (6 new, all `recurring-event-*` prefix)

1. **`recurring-event-check-in`** — `member_id` + optional `occurrence_id`; resolves timeslot, assigns next available slot atomically. Kiosk/admin JWT.
2. **`recurring-event-member-preview`** — ID lookup + commitment info; no side effects. Kiosk/admin JWT.
3. **`get-recurring-event-template`** — admin read of template + areas + slots
4. **`upsert-recurring-event-template`** — admin write (template + areas + slots)
5. **`create-recurring-event-occurrence`** — admin-triggered, cron-ready; creates occurrence for a given date
6. **`list-recurring-event-attendees`** — check-ins for an occurrence with member + assignment detail

### Phase 4 — Admin UI (`src/pages/admin/recurring-events/`)

| Route                                                           | Page                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/admin/recurring-events`                                       | List all templates (name, schedule_type, occurrence count); create/archive |
| `/admin/recurring-events/:template_id`                          | Occurrences list for a template                                            |
| `/admin/recurring-events/:template_id/template`                 | Configure timeslots + areas/slots ("cinema seating" builder)               |
| `/admin/recurring-events/:template_id/occurrences/:id`          | Occurrence detail — per-timeslot tabs                                      |
| `/admin/recurring-events/:template_id/occurrences/:id/check-in` | Admin check-in (minimized shell)                                           |

### Phase 5 — Member Kiosk (`src/pages/recurring-event-kiosk/`)

- **`/recurring-event-kiosk/:template_id`** — minimized shell, scoped to one recurring event per kiosk device
- Step 1: Member ID input (RFID or manual)
- Step 2: Preview — name, active timeslot, committed timeslots for today's ordinal
- Step 3: Confirm → edge function → show assigned area+slot or "walk-in, no slot reserved"
- Auto-reset after timeout (existing kiosk pattern)

### Phase 6 — Verification

1. Unit tests: `getSundayOrdinal` (5th Sunday, boundary months), `resolveCommittedTimeslots` (comma parsing, missing key), `resolveActiveTimeslot` (window boundaries)
2. Integration: check-in idempotency, slot uniqueness, walk-in path
3. `npm run build:agent`, `npm run test:agent`
4. Manual QA: create template → areas → slots → occurrence → scan member ID

---

## Out of Scope (this iteration)

- Auto-generate cron for next occurrence (manual creation for now; cron is follow-on)
- Member pre-RSVP for recurring events
- Slot pre-assignment roster before check-in day
- CSV export for recurring event attendance
- Realtime attendee list
- Non-Sunday schedule types (data model ready; commitment resolution is Sunday-specific)

---

## Key Decisions

| Decision                                  | Rationale                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `recurring_event_*` table prefix          | Extensible to future schedule types without schema redesign                                  |
| `schedule_type` field on template         | Gateway for future recurrence logic (`weekly_monday`, `biweekly`, etc.)                      |
| Ordinal stored on occurrence at creation  | Not re-derived at runtime; avoids DST/edge-case bugs                                         |
| First-come-first-served slot assignment   | Simpler and fair; no committed-member priority queue                                         |
| Walk-in always succeeds                   | `null area_slot_id` if no slot available for the role                                        |
| Multiple templates active simultaneously  | `is_archived` is soft-delete only, not a uniqueness gate                                     |
| `unique(template_id, occurrence_date)`    | Different templates can have occurrences on the same date                                    |
| Kiosk scoped via `:template_id` URL param | Each kiosk device bookmarks one recurring event                                              |
| Kiosk uses minimized shell                | Consistent with existing event check-in kiosk pattern                                        |
| Commitment metadata keys Sunday-specific  | `metadata.third_sunday` etc.; generalization deferred until a second schedule type is needed |

---

## Further Considerations

1. **Slot re-use across timeslots** — same physical slot (e.g. "Table 3") serves different members at 9am/12nn/3pm; occupancy is checked per `(occurrence_id, area_slot_id, timeslot)`.
2. **Cron auto-generation** — `create-recurring-event-occurrence` is already callable by both admin UI and a future cron job.
3. **Multi-role areas** — currently one role per `recurring_event_areas` row. If an area needs to serve multiple roles, a `recurring_event_area_roles` join table is needed. Flag for future.
4. **Template config editor** — the `AdminRecurringEventTemplatePage` is a simplified MVP; full area/slot inline editor with RHF field arrays is a follow-on task.

---

## Implementation Status (2026-08-13)

| Phase                    | Status            | Notes                                                |
| ------------------------ | ----------------- | ---------------------------------------------------- |
| Phase 1 — DB Migrations  | ✅ Complete       | `supabase migrations up` applied                     |
| Phase 2 — Domain Layer   | ✅ Complete       | 15 unit tests passing                                |
| Phase 3 — Edge Functions | ✅ Complete       | All 6 registered in `config.toml`                    |
| Phase 4 — Admin UI       | ✅ Complete (MVP) | Template config page is simplified read-only display |
| Phase 5 — Member Kiosk   | ✅ Complete       | Minimized shell, kiosk auth, URL-scoped              |
| Router + Routes          | ✅ Complete       | 5 lazy routes, ROUTE_PATHS, query keys               |
| Build                    | ✅ Clean          | 0 TypeScript errors                                  |
| Tests                    | ✅ Passing        | 1427 tests, 185 test files                           |
