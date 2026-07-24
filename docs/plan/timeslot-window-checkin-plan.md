## Plan: Timeslot Window-Based Check-In UX

Add optional per-timeslot check-in windows in attendance settings, resolve the active timeslot during admin check-in from current time, and block manual check-in actions outside any active window while hiding the generic check-in button in this mode. Move attendance settings timeslots from plain text array to structured JSON payload and keep rollout limited to admin check-in UI behavior for this iteration.

Proposed timeslot JSON contract:

- `[{ slot_at: string, opens_at: string | null, closes_at: string | null }]`
- All values are UTC ISO strings at rest; form edits continue to use local datetime inputs and existing conversion helpers.
- Auto-window mode is derived (not a new flag): enabled when timeslot attendance is enabled and at least one configured slot has both `opens_at` and `closes_at`.

**Steps**

1. Phase 1 - Domain contract and schema alignment
1. Add attendance domain types for structured slots (for example `AttendanceTimeslotConfig`) and update `AttendanceSettings` to use structured `timeslots` values.
1. Add compatibility parsing helpers that can normalize both legacy `text[]` slot strings and new JSON slot objects during rollout.
1. Extend Zod schemas to validate slot/window consistency and invariants:
1. `opens_at <= slot_at <= closes_at` when all are present.
1. Reject partial windows (only open or only close) to avoid ambiguous auto-window mode.
1. Reject overlapping windows to prevent multiple active slots at the same time.
1. Add pure selectors in domain layer for check-in orchestration:
1. `resolveActiveTimeslot(nowIso, slots)` returns one active slot or null.
1. `isAutoWindowModeEnabled(settings)` returns true only when at least one complete window exists.
1. `hasAnyActiveWindow(nowIso, slots)` returns whether now falls in at least one window.
1. Phase 2 - Persistence and migration plan (depends on Phase 1)
1. Add SQL migration to change `attendance_settings.timeslots` from `text[]` to `jsonb not null default '[]'::jsonb`.
1. Add one-way data migration mapping each existing slot string into `{ slot_at, opens_at: null, closes_at: null }`.
1. Keep existing table constraints aligned with new shape (timeslot enabled still requires non-empty timeslots).
1. Confirm no RLS or privilege changes are needed because read/write path remains unchanged.
1. Phase 3 - Query/mutation normalization and settings form (depends on Phase 2)
1. Update attendance settings query normalization so reads can safely consume legacy/new payload shapes while migration is rolling out.
1. Update attendance settings mutation payload mapping to always write normalized JSON slot objects.
1. Update admin attendance settings page to edit per-slot window fields (`opens_at`, `slot_at`, `closes_at`) with inline validation feedback.
1. Preserve current event-window guard: slot and optional window bounds must remain inside event start/end.
1. Phase 4 - Admin check-in UX behavior (depends on Phase 3)
1. Replace current suggested-slot-by-nearest-time resolver with active-window resolver for auto-window mode.
1. Auto-window mode behavior:
1. If active slot exists, mark it as suggested/preselected on confirm step.
1. Hide generic Confirm Check-In button.
1. Allow check-in only through explicit slot button confirmation.
1. If no active slot exists, block check-in progression and show clear message: `No active timeslot window right now.`
1. Keep manual timeslot flow unchanged when auto-window mode is off.
1. Phase 5 - Regression safety and verification (depends on Phases 1-4)
1. Add domain unit tests for normalization and selector logic (boundaries, overlaps, no windows, malformed values).
1. Extend schema tests for window consistency and overlap rejection.
1. Add check-in component tests for:
1. hidden generic confirm button in auto-window mode,
1. blocked state message with no active window,
1. active-slot suggestion behavior,
1. unchanged manual flow fallback behavior.
1. Validate query invalidation and attendee cache update behavior after successful check-in remains correct.

**Parallelism and dependencies**

1. Parallel-safe: selector tests can be authored while migration SQL is being prepared.
1. Blocking: check-in UI changes should not start until domain selectors and normalization contract are finalized.
1. Blocking: form payload write path should switch to JSON only after migration path is defined and reviewed.
1. Blocking: full regression pass requires both settings form and check-in confirm-step updates.

**Relevant files**

- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/types.ts - extend AttendanceSettings and timeslot value contracts.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/schemas.ts - add Zod rules for optional per-slot check-in windows and helper schema builders.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/transforms.ts - add legacy/new shape normalization helpers for timeslots.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/index.ts - export new helper selectors/resolvers if needed.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/hooks/domain/attendance/queries/useAttendanceSettingsQuery.ts - normalize backend payload to new structured shape.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/hooks/domain/attendance/mutations/useUpdateAttendanceSettingsMutation.ts - send normalized structured timeslot payload.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/index.tsx - attendance settings UI for slot + optional window fields.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/check-in/index.tsx - active timeslot resolution and check-in state gates.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/check-in/components/AttendeeConfirmStep.tsx - hide generic check-in button in auto-window mode and show blocked-state message.
- /Users/baronparedes/Documents/projects/wc-event-registration/supabase/migrations/20260703100000_add_attendance_foundation.sql - reference current settings shape.
- /Users/baronparedes/Documents/projects/wc-event-registration/supabase/migrations/<new_migration>.sql - JSONB migration for timeslot window payload.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/**tests**/schemas.test.ts - schema validation coverage.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/**tests**/transforms.test.ts - normalization helper coverage.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/check-in/**tests**/\* - check-in UI behavior coverage for auto-window mode.

**Verification**

1. Run targeted unit tests for attendance schemas and new slot-window resolver tests.
1. Run targeted unit tests for legacy/new timeslot normalization helpers.
1. Run targeted check-in component tests covering active window, no active window, and manual fallback behavior.
1. Run npm run test:agent once for final regression pass.
1. Run npm run build:agent to verify TypeScript and bundling integrity.
1. Manual admin QA: create event with timeslots/windows, verify only active-slot check-in path appears, and verify blocked state when outside all windows.

**Decisions**

- Store timeslot rules as JSON in DB (migrate from current plain slot list).
- Auto behavior means preselect/resolve slot automatically, but still require explicit timeslot-button confirmation.
- If no active window exists, block check-in and show explicit message.
- Reject overlapping windows in validation to avoid ambiguous active-slot selection.
- Scope limited to admin check-in UI behavior for this iteration; no kiosk/API enforcement changes in this pass.

**Further Considerations**

1. Time zone policy: persist UTC ISO timestamps and display/edit in local admin timezone, matching existing datetime-local conversion behavior.
1. Backward compatibility: keep temporary legacy parser until all events are resaved under JSON shape.
1. Optional follow-up: add lightweight telemetry for blocked check-in attempts outside active windows to confirm operational impact.
