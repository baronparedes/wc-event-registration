## Plan: Timeslot Window-Based Check-In UX

Add optional per-timeslot check-in windows in attendance settings, resolve the active timeslot during admin check-in from current time, and block manual check-in actions outside any active window while hiding the generic check-in button in this mode. Use JSON-based timeslot configuration in attendance settings and keep rollout limited to admin check-in UI behavior for now.

**Steps**

1. Phase 1: Domain contract and schema alignment
2. Update attendance domain types to support structured timeslot objects (slot time + optional open/close window), while preserving backward compatibility parsing for existing text[] values during migration rollout. This blocks all downstream UI and hook updates.
3. Extend Zod schemas and transform helpers to validate optional windows and enforce rule consistency: open_at <= slot_at <= close_at when window values exist.
4. Add pure helper selectors for check-in pages: resolveActiveTimeslot(now, configuredSlots), isAutoWindowModeEnabled(settings), and hasAnyActiveWindow(now, configuredSlots). Keep these in domain layer to avoid duplicating logic in components. Depends on steps 2-3.
5. Phase 2: Persistence and settings-form behavior
6. Prepare migration plan from text[] to JSONB-based timeslot payload in attendance settings. Include one-way data migration that maps each existing slot string into structured objects with null window fields.
7. Update attendance settings query/mutation transforms so reads normalize legacy/new shapes and writes persist only normalized JSON objects.
8. Enhance admin attendance settings form to allow optional window inputs per timeslot row (slot open, slot time, slot close), including validation feedback and save payload mapping.
9. Phase 3: Admin check-in UX changes
10. In admin check-in orchestration page, replace current suggested-slot resolver with active-window resolver that returns exactly one candidate slot when now is within configured window.
11. Apply UI behavior for auto-window mode: when enabled and an active slot exists, preselect that slot; do not render the generic Confirm Check-In button; allow only explicit timeslot button confirm. Depends on step 10.
12. Add no-active-window state: disable check-in progression and show explicit message No active timeslot window right on confirm step (and/or top banner on page) so staff understand why check-in is blocked.
13. Keep manual timeslot behavior unchanged when auto-window mode is not enabled or no slot windows are configured.
14. Phase 4: Regression safety and verification
15. Add/adjust unit tests for schema validation and slot-window resolution helpers (boundary times, overlaps, no windows, malformed windows).
16. Add component tests for confirm-step rendering rules: button hidden in auto-window mode, blocked state message when no active window, and preselected active slot behavior.
17. Validate no regression in existing timeslot/manual check-in flow and query invalidation behavior after successful check-in.

**Relevant files**

- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/types.ts — extend AttendanceSettings and timeslot value contracts.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/schemas.ts — add Zod rules for optional per-slot check-in windows and helper schema builders.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/index.ts — export new helper selectors/resolvers if needed.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/hooks/domain/attendance/queries/useAttendanceSettingsQuery.ts — normalize backend payload to new structured shape.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/hooks/domain/attendance/mutations/useUpdateAttendanceSettingsMutation.ts — send normalized structured timeslot payload.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/index.tsx — attendance settings UI for slot + optional window fields.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/check-in/index.tsx — active timeslot resolution and check-in state gates.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/check-in/components/AttendeeConfirmStep.tsx — hide generic check-in button in auto-window mode and show blocked-state message.
- /Users/baronparedes/Documents/projects/wc-event-registration/supabase/migrations/20260703100000_add_attendance_foundation.sql — reference current settings shape.
- /Users/baronparedes/Documents/projects/wc-event-registration/supabase/migrations/<new_migration>.sql — JSONB migration for timeslot window payload.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/domain/attendance/**tests**/schemas.test.ts — schema validation coverage.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/events/[id]/attendance/check-in/**tests**/\* — check-in UI behavior coverage for auto-window mode.

**Verification**

1. Run targeted unit tests for attendance schemas and new slot-window resolver tests.
2. Run targeted check-in component tests covering active window, no active window, and manual fallback behavior.
3. Run npm run test:agent once for final regression pass.
4. Run npm run build:agent to verify TypeScript and bundling integrity.
5. Manual admin QA: create event with timeslots/windows, verify only active-slot check-in path appears, and verify blocked state when outside all windows.

**Decisions**

- Store timeslot rules as JSON in DB (migrate from current plain slot list).
- Auto behavior means preselect/resolve slot automatically, but still require explicit timeslot-button confirmation.
- If no active window exists, block check-in and show explicit message.
- Scope limited to admin check-in UI behavior for this iteration; no kiosk/API enforcement changes in this pass.

**Further Considerations**

1. Overlapping windows policy recommendation: reject overlaps in settings validation to avoid ambiguous active-slot selection.
2. Time zone policy recommendation: persist UTC ISO timestamps and display/edit in local admin timezone, matching existing datetime-local conversion behavior.
3. Backward compatibility recommendation: include a temporary legacy parser for old slot arrays until all events are resaved under JSON shape.
