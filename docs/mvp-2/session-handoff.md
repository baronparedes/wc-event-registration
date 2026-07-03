# MVP2 Session Handoff

Last updated: 2026-07-03
Owner baseline: 1 dev-agent, sequential execution
Scope: EPIC-8 Event-Day Attendance (8.1 through 8.6)

## Pause Snapshot

- Current state: Paused after completing Session 1 (EPIC-8-S1).
- Next session to start: Session 2 (EPIC-8-S2 Event Attendance Settings).
- Latest validation at pause:
  - `npm run ci:gate` passed.
  - `npm run supabase:db:reset` passed.
- Naming decision now enforced in implementation: use "attendance fields" and "attendance answers" (no "assignment" naming in attendance domain artifacts).

## Execution Baseline

- This handoff converts technical design into implementation sessions.
- Each session is sized for approximately one day.
- Sessions are ordered by hard dependencies.
- Do not change MVP scope during execution unless explicitly approved.

## Resolved Decisions

1. DEC-004: Read path for check-in search

- **Resolved**: Option B selected — edge-mediated reads via search-attendees Edge Function.
- Rationale: simpler RLS surface; avoids direct authenticated reads on attendance tables.

2. ASM-003: Assignment field max lengths

- **Resolved**: Superseded by design change. Assignment fields are now dynamic (admin-configured), matching the event-fields pattern. Field-level validation_rules control any max length constraints per field definition.

## Session Plan

## Session 1 - EPIC-8-S1 Attendance Foundation

Goal:

- Create attendance domain contracts, schema, migration, and security baseline.

Checklist:

- [x] Add attendance domain module under src/lib/domain/attendance
- [x] Add attendance-fields domain module under src/lib/domain/attendance-fields
- [x] Add Zod schemas for settings (dependency enforcement), walk-in payload (superRefine contact check), slot payload
- [x] Add Zod schemas for attendance field CRUD and dynamic attendance response schema factory
- [x] Add additive migration for attendance tables and constraints
- [x] Add deny-by-default RLS and explicit service_role grants
- [x] Register planned attendance functions in supabase/config.toml
- [x] Ensure no behavior change to existing registration flows

Expected file touch zones:

- src/lib/domain/attendance/
- src/lib/domain/attendance-fields/
- supabase/migrations/
- supabase/config.toml

Validation gate:

- [x] npm run build passes
- [x] npm run format:check passes
- [x] supabase test db passes

Exit criteria:

- [x] Storage model and contracts compile and are ready for UI/mutation slices.

## Session 2 - EPIC-8-S2 Event Attendance Settings

Goal:

- Deliver attendance settings with dependency enforcement.

Checklist:

- [x] Add settings query hook and mutation hook
- [x] Add admin event settings UI section for Attendance Tracking, Walk-In Mode, Timeslot Attendance
- [x] Implement update-attendance-settings Edge Function
- [x] Enforce dependency rule: walk-in and timeslot cannot be enabled if attendance is disabled
- [x] Add confirmation and persistence feedback

Expected file touch zones:

- src/pages/admin/events/[id]/
- src/hooks/domain/attendance/queries/
- src/hooks/domain/attendance/mutations/
- supabase/functions/update-attendance-settings/

Validation gate:

- [x] Feature 8.1 scenarios pass in local QA
- [x] Reload preserves settings

Exit criteria:

- Attendance settings are persisted and enforce dependency rules.

## Session 3 - EPIC-8-S3 Attendance Field Configuration

Goal:

- Deliver attendance field definition CRUD and per-registrant data entry for configured fields.

Checklist:

- [ ] Add attendance field query and mutation hooks under src/hooks/domain/attendance-fields/
- [ ] Add answer query and mutation hooks under src/hooks/domain/attendance/
- [ ] Add field configuration UI (create, edit, delete, reorder) under attendance/fields/ page
- [ ] Add data entry list (per-registrant fill-in) under same page section
- [ ] Implement create-attendance-field, update-attendance-field, delete-attendance-field, reorder-attendance-fields Edge Functions
- [ ] Implement upsert-attendance-answers Edge Function
- [ ] Block attendance field edits when attendance is disabled
- [ ] Keep attendance data separate from registration answers

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/fields/
- src/hooks/domain/attendance-fields/queries/
- src/hooks/domain/attendance-fields/mutations/
- src/hooks/domain/attendance/queries/ (attendance answers query)
- src/hooks/domain/attendance/mutations/ (upsert answers mutation)
- supabase/functions/create-attendance-field/
- supabase/functions/update-attendance-field/
- supabase/functions/delete-attendance-field/
- supabase/functions/reorder-attendance-fields/
- supabase/functions/upsert-attendance-answers/

Validation gate:

- [ ] Feature 8.2 scenarios pass in local QA
- [ ] Configured field values visible in downstream check-in context read

Exit criteria:

- Attendance field configuration and data entry operational; data isolated from registration answer storage.

## Session 4 - EPIC-8-S4 Registered Check-In

Goal:

- Deliver check-in by Member ID, name, and email with First Check-In Rule.

Checklist:

- [ ] Add attendee search by Member ID token, name fragment, and email (via search-attendees Edge Function)
- [ ] Add disambiguation result list for multi-match names
- [ ] Add check-in action flow and success/duplicate states
- [ ] Implement search-attendees Edge Function (edge-mediated read, DEC-004 Option B)
- [ ] Implement check-in-attendee Edge Function with idempotent first check-in behavior
- [ ] Ensure official first check-in timestamp is never overwritten

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/check-in/
- src/hooks/domain/attendance/queries/
- src/hooks/domain/attendance/mutations/
- supabase/functions/search-attendees/
- supabase/functions/check-in-attendee/

Validation gate:

- [ ] Feature 8.3 scenarios pass in local QA
- [ ] Repeat check-in keeps original timestamp

Exit criteria:

- Registered attendee check-in is stable and race-safe.

## Session 5 - EPIC-8-S5 Walk-In Check-In

Goal:

- Deliver walk-in create-and-check-in flow behind Walk-In Mode toggle.

Checklist:

- [ ] Add walk-in form in check-in flow for not-found cases
- [ ] Validate full name and at least one contact method
- [ ] Implement create-walk-in-check-in Edge Function
- [ ] Mark walk-in attendees clearly in UI response states
- [ ] Return to ready-for-next-attendee state immediately after completion

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/check-in/
- src/lib/domain/attendance/schemas.ts
- src/hooks/domain/attendance/mutations/
- supabase/functions/create-walk-in-check-in/

Validation gate:

- [ ] Feature 8.4 scenarios pass in local QA
- [ ] Walk-in blocked when mode disabled

Exit criteria:

- Walk-in policy is enforced and flow remains operationally fast.

## Session 6 - EPIC-8-S6 Timeslot Attendance

Goal:

- Add additive slot tracking without changing overall attendance semantics.

Checklist:

- [ ] Add timeslot configuration persistence support from settings
- [ ] Add slot selection in check-in path when timeslot mode is enabled
- [ ] Validate slot is in event-configured slot set
- [ ] Record slot attendance separately from official first check-in
- [ ] Add slot-level summaries separate from overall totals

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/check-in/
- src/hooks/domain/attendance/queries/
- src/hooks/domain/attendance/mutations/
- supabase/functions/check-in-attendee/

Validation gate:

- [ ] Feature 8.5 scenarios pass in local QA
- [ ] Repeated slot actions do not change first-check-in timestamp

Exit criteria:

- Slot mode works and remains additive.

## Session 7 - EPIC-8-S7 Attendance CSV Export

Goal:

- Deliver dedicated attendance export independent from registration export.

Checklist:

- [ ] Add export action entry point for attendance-enabled events
- [ ] Implement export-attendance-csv Edge Function
- [ ] Include required columns: identity, status, official check-in time, attendance field details, walk-in marker
- [ ] Return headers-only CSV for no-record events
- [ ] Ensure registration export behavior remains unchanged

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/
- src/hooks/domain/attendance/mutations/
- supabase/functions/export-attendance-csv/

Validation gate:

- [ ] Feature 8.6 scenarios pass in local QA
- [ ] Golden-file CSV checks for populated and empty exports

Exit criteria:

- Attendance export is stable, scoped, and isolated from registration export.

## Cross-Session Quality Gates

Run at end of every session:

- [ ] npm run build
- [ ] npm run format:check
- [ ] Relevant unit tests for changed hooks, schemas, and transforms
- [ ] Relevant Edge Function tests or local invocation checks

Run at end of Session 7:

- [ ] End-to-end scenario pass for 8.1 to 8.6
- [ ] Regression check: registration export unchanged
- [ ] Regression check: ID-first registration flow unchanged
- [ ] Regression check: no new public direct write paths

## Risk Watchlist During Implementation

1. Scope creep into non-admin staffing model

- Mitigation: keep admin-only boundary explicit in PR scope

2. Race conditions on repeated scan/search actions

- Mitigation: DB uniqueness plus idempotent function logic

3. Coupling attendance data with registration answers

- Mitigation: enforce dedicated attendance tables and contracts

4. Export regressions impacting registration CSV

- Mitigation: keep separate function and formatter path

## Start-Next Session Prompt

Use this prompt for the next dev-agent execution session:

Implement Session 2 from docs/mvp-2/session-handoff.md and follow docs/mvp-2/technical-design-attendance.md as contract source. Keep scope limited to EPIC-8-S2 only, deliver attendance settings end-to-end (query, mutation, UI section, and update-attendance-settings Edge Function), and run build plus format plus local QA checks for feature 8.1 before handoff.
