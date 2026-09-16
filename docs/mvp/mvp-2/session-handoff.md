# MVP2 Session Handoff

Last updated: 2026-07-12
Owner baseline: 1 dev-agent, sequential execution
Scope: EPIC-8 Event-Day Attendance (8.1 through 8.7 including bulk CSV edit)

## Pause Snapshot

- Current state: Paused after implementing Session 7 (EPIC-8-S6 Timeslot Attendance) and post-session coverage stabilization.
- Next session to start: Session 8 (EPIC-8-S7 Attendance CSV Export).
- Latest validation at pause:
  - `npm run test:agent` passed.
  - Global branch coverage recovered to threshold (90.02%).
- New route `/admin/events/:id/attendance/fields` added for attendance field config + data entry.

## Remaining Feature Priority (Pivoted)

1. Attendance Export (Session 8 / EPIC-8-S7)

## 2026-07-11 Session 5 Implementation Addendum

- Walk-in-mode implementation scope removed from attendance settings, contracts, and check-in behavior.
- Check-in not-found handling is now registration-first, with quick action(s) placed inside dismissible error info.
- Direct "Retry Search" quick action was removed from the dismissible error info per UX refinement.
- Event-day admin registration reopen operation is wired into the check-in not-found flow.
- `search-attendees` was optimized to keep two primary search queries (registered and public).
- Nickname + last_name aggregate matching now applies to both public registrations and registered-member search paths.
- Registered search now uses a joined registrations-to-users query instead of a pre-query users lookup.

## 2026-07-12 Session 7 Implementation Addendum

- Timeslot attendance check-in flow is implemented end-to-end for configured events.
- Check-in confirm step now supports direct timeslot action with kiosk-optimized one-per-line controls.
- Suggested timeslot remains visible as guidance, while explicit timeslot choice remains operator-controlled.
- Check-in page scope was intentionally kept check-in-only; slot-level summary UI was removed from this route.
- Non-timeslot check-in flow behavior was preserved and validated after timeslot-path refactors.

## 2026-07-12 Coverage Stabilization Addendum

- CI branch coverage was recovered from 89.96% to 90.02%.
- Added targeted branch tests in date-format utilities and wizard-step scroll hook behavior.
- Current status: `npm run ci:gate` passes at pause.

## 2026-07-05 Doc Addendum - Public Attendee Details

- Pre-event attendee details now support both registered and public self-registered attendees in the same admin attendee-details workflow.
- Public attendee pre-event details are stored separately from registration answers and separately from registered attendee attendance answers.
- New storage table: `public_attendance_answers` keyed by `public_registration_id` and attendance field.
- Query behavior: attendee details list loads registered attendees and public attendees together, excluding cancelled public registrations.
- Save behavior: updates route by attendee kind (`registration_id` for registered, `public_registration_id` for public).

## Execution Baseline

- This handoff converts technical design into implementation sessions.
- Each session is sized for approximately one day.
- Sessions are ordered by hard dependencies.
- Do not change MVP scope during execution unless explicitly approved.

## Resolved Decisions

1. DEC-004: Read path for check-in search

- **Resolved**: Option B selected — edge-mediated reads via search-attendees Edge Function.
- Rationale: simpler RLS surface; avoids direct authenticated reads on attendance tables.

1. ASM-003: Assignment field max lengths

- **Resolved**: Superseded by design change. Assignment fields are now dynamic (admin-configured), matching the event-fields pattern. Field-level validation_rules control any max length constraints per field definition.

## Session Plan

## Session 1 - EPIC-8-S1 Attendance Foundation

Goal:

- Create attendance domain contracts, schema, migration, and security baseline.

Checklist:

- [x] Add attendance domain module under src/lib/domain/attendance
- [x] Add attendance-fields domain module under src/lib/domain/attendance-fields
- [x] Add Zod schemas for settings (dependency enforcement) and slot payload
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
- [x] Add admin event settings UI section for Attendance Tracking and Timeslot Attendance
- [x] Implement update-attendance-settings Edge Function
- [x] Enforce dependency rule: timeslot cannot be enabled if attendance is disabled
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

- [x] Add attendance field query and mutation hooks under src/hooks/domain/attendance-fields/
- [x] Add answer query and mutation hooks under src/hooks/domain/attendance/
- [x] Add field configuration UI (create, edit, delete, reorder) under attendance/fields/ page
- [x] Add data entry list (per-registrant fill-in) under same page section
- [x] Implement create-attendance-field, update-attendance-field, delete-attendance-field, reorder-attendance-fields Edge Functions
- [x] Implement upsert-attendance-answers Edge Function
- [x] Block attendance field edits when attendance is disabled
- [x] Keep attendance data separate from registration answers

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

- [x] npm run build passes
- [x] npm run format:check passes

Exit criteria:

- Attendance field configuration and data entry operational; data isolated from registration answer storage.

## Session 4 - EPIC-8-S4 Registered Check-In

Goal:

- Deliver check-in by Member ID, name, and email with First Check-In Rule.

Checklist:

- [x] Add attendee search by Member ID token, name fragment, and email (via search-attendees Edge Function)
- [x] Add disambiguation result list for multi-match names
- [x] Add check-in action flow and success/duplicate states
- [x] Implement search-attendees Edge Function (edge-mediated read, DEC-004 Option B)
- [x] Implement check-in-attendee Edge Function with idempotent first check-in behavior
- [x] Ensure official first check-in timestamp is never overwritten

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/check-in/
- src/hooks/domain/attendance/queries/
- src/hooks/domain/attendance/mutations/
- supabase/functions/search-attendees/
- supabase/functions/check-in-attendee/

Validation gate:

- [x] Feature 8.3 scenarios pass in local QA
- [x] Repeat check-in keeps original timestamp

Exit criteria:

- Registered attendee check-in is stable and race-safe.

## Session 5 - EPIC-8-S5 Unregistered Attendee Registration Reopen Policy

Goal:

- Replace direct walk-in check-in with an operational path: reopen registration on event day when allowed, then use normal check-in.

Checklist:

- [x] Remove walk-in create-and-check-in implementation scope from check-in flow
- [x] Add clear not-found guidance in check-in UI to complete registration first
- [x] Document and implement admin event-day registration reopen operational path
- [x] Verify newly registered attendees are discoverable immediately in standard check-in flow
- [x] Keep first-check-in behavior unchanged after same-day registration

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/check-in/
- src/pages/admin/events/[id]/
- src/hooks/domain/attendance/queries/
- docs/features/8-event-day-attendance-tracking/

Validation gate:

- [x] Feature 8.4 scenarios pass in local QA
- [x] Unregistered attendee path requires registration-first behavior

Exit criteria:

- [x] Unregistered attendee handling is registration-first and uses existing standard check-in semantics.

## Session 6 - EPIC-8-S8 Bulk CSV Edit Attendance Data

Goal:

- Deliver bulk attendee data updates via CSV download-edit-upload workflow.

Checklist:

- [x] Add download-attendance-csv Edge Function to generate template with all attendees + attendance fields
- [x] Add bulk-upsert-attendance-answers Edge Function for server-side row validation and atomic upsert
- [x] Create csv-parser utility to parse and structure CSV text into rows
- [x] Create Zod row validator schema reusing existing field type validators
- [x] Add useDownloadAttendanceCSVMutation hook calling new Edge Function
- [x] Add useBulkUpsertAttendanceAnswersMutation hook with atomic failure handling
- [x] Create BulkUploadModal component with file input, preview, and error display
- [x] Add download and upload buttons to attendance data page
- [x] Ensure atomic validation: reject entire import if any row invalid
- [x] Ensure overwrite strategy: replace all answers for rows in CSV (not merge)
- [x] Block bulk operations when attendance is disabled

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/data/
- src/pages/admin/events/[id]/attendance/data/components/BulkUploadModal.tsx
- src/hooks/domain/attendance/mutations/useDownloadAttendanceCSVMutation.ts
- src/hooks/domain/attendance/mutations/useBulkUpsertAttendanceAnswersMutation.ts
- src/hooks/domain/attendance/mutations/index.ts (barrel export)
- src/lib/domain/attendance/csv-parser.ts
- src/lib/domain/attendance/schemas.ts (add bulk row validator)
- supabase/functions/download-attendance-csv/
- supabase/functions/bulk-upsert-attendance-answers/
- supabase/config.toml

Validation gate:

- [x] Feature 8.7 scenarios pass in local QA
- [x] CSV parsing handles quote/escape edge cases
- [x] Atomic validation correctly rejects entire batch on single row error
- [ ] Large CSV (100s of rows) completes without timeout

Exit criteria:

- [x] Bulk CSV edit workflow is operational; attendance data bulk updates are atomic and safe.

## Session 7 - EPIC-8-S6 Timeslot Attendance

Goal:

- Add additive slot tracking without changing overall attendance semantics.

Checklist:

- [x] Add timeslot configuration persistence support from settings
- [x] Add slot selection in check-in path when timeslot mode is enabled
- [x] Validate slot is in event-configured slot set
- [x] Record slot attendance separately from official first check-in
- [x] Keep check-in route focused on check-in workflow only (slot summary intentionally out of this route scope)

Expected file touch zones:

- src/pages/admin/events/[id]/attendance/check-in/
- src/hooks/domain/attendance/queries/
- src/hooks/domain/attendance/mutations/
- supabase/functions/check-in-attendee/

Validation gate:

- [x] Feature 8.5 core scenarios pass in local QA
- [x] Repeated slot actions do not change first-check-in timestamp

Exit criteria:

- [x] Slot mode works and remains additive.

## Session 8 - EPIC-8-S7 Attendance CSV Export

Goal:

- Deliver dedicated attendance export independent from registration export.

Checklist:

- [ ] Add export action entry point for attendance-enabled events
- [ ] Implement export-attendance-csv Edge Function
- [ ] Include required columns: identity, status, official check-in time, attendance field details
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

- [x] npm run build
- [ ] npm run format:check
- [x] Relevant unit tests for changed hooks, schemas, and transforms
- [ ] Relevant Edge Function tests or local invocation checks

Run at end of Session 6:

- [ ] Feature 8.7 scenarios pass in local QA
- [ ] Bulk import atomic validation working (entire batch rejected on single row error)
- [ ] CSV parsing handles quote/escape edge cases correctly
- [ ] Large CSV (100+ rows) completes without timeout

Run at end of Session 8:

- [ ] End-to-end scenario pass for 8.1 to 8.6
- [ ] Regression check: registration export unchanged
- [ ] Regression check: ID-first registration flow unchanged
- [ ] Regression check: no new public direct write paths

## Risk Watchlist During Implementation

1. Scope creep into non-admin staffing model

- Mitigation: keep admin-only boundary explicit in PR scope

1. Race conditions on repeated scan/search actions

- Mitigation: DB uniqueness plus idempotent function logic

1. Coupling attendance data with registration answers

- Mitigation: enforce dedicated attendance tables and contracts

1. Export regressions impacting registration CSV

- Mitigation: keep separate function and formatter path

## Start-Next Session Prompt

Use this prompt for the next dev-agent execution session:

Implement Session 8 from docs/mvp-2/session-handoff.md and follow docs/mvp-2/technical-design-attendance.md as contract source. Keep scope limited to EPIC-8-S7 only: add dedicated attendance CSV export behavior, keep it isolated from registrations export, and validate populated and empty export outputs.
