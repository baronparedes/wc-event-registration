# MVP2 Technical Design: Event-Day Attendance

## Source Inputs

- Gherkin feature files reviewed:
  - docs/features/8-event-day-attendance-tracking/8.1-configure-attendance-settings.feature
  - docs/features/8-event-day-attendance-tracking/8.2-manage-pre-event-assignments.feature
  - docs/features/8-event-day-attendance-tracking/8.3-check-in-registered-attendees.feature
  - docs/features/8-event-day-attendance-tracking/8.4-handle-walk-in-check-in.feature
  - docs/features/8-event-day-attendance-tracking/8.5-track-timeslot-attendance.feature
  - docs/features/8-event-day-attendance-tracking/8.6-export-attendance-csv.feature
- Planning input reviewed:
  - docs/mvp-2/implementation-plan.md
- Glossary reviewed:
  - .github/instructions/domain-glossary.instructions.md
- Repository constraints applied:
  - ID-first registration flow remains unchanged
  - Public writes stay behind approved secure backend paths
  - Admin-only event-day operations for MVP2
  - React Hook Form for all forms, React Query for server state, Zod at runtime boundaries
  - Edge Function registration required in supabase/config.toml

Term alignment note:

- Feature 8.3 uses RFID scan language. Canonical term is Member ID. This design treats RFID as one form of Member ID input token without changing glossary semantics.

## Resolved Decisions

- DEC-004 (Read path for check-in search): **Option B selected** — edge-mediated read via search-attendees Edge Function for simpler RLS surface.
- ASM-003 (Assignment field max lengths): **Superseded** — assignment fields are now fully dynamic (admin-configurable, like event-fields). Field-level max lengths are controlled via validation_rules in each field definition. Hardcoded column lengths no longer apply.

## Architecture Scope

- Target epic/chunk:
  - Epic 8 full scope (8.1 through 8.6)
  - Umbrella chunk ID: EPIC-8
- In-scope technical surfaces:
  - Admin event settings UI for Attendance Tracking, Walk-In Mode, Timeslot Attendance
  - Assignment management UI and persistence for registered attendees
  - Admin check-in UI and APIs (Member ID scan, name search, email search)
  - Walk-in create-and-check-in flow when Walk-In Mode is enabled
  - Optional timeslot attendance recording and reporting
  - Attendance CSV export action and server-side generation
  - Schema, migrations, RLS, grants, and Edge Function registrations for attendance domain
- Out-of-scope/deferred surfaces:
  - Non-admin check-in staff authorization model
  - Advanced timeslot UX beyond baseline slot selection and slot-level reporting
  - Changes to registration export behavior except coexistence safeguards
  - Any change to public registration or duplicate policy semantics

## System Design

### Component and module boundaries

- Frontend orchestration:
  - Admin event detail page composes attendance settings section and links to attendance operations
  - New attendance pages under admin event route segments orchestrate query/mutation hooks and state
- Hooks:
  - Queries for attendance settings, assignment list, attendee search results, attendance summaries
  - Mutations for settings updates, assignment field CRUD, assignment answer upsert, check-in, walk-in check-in, CSV export trigger
- Domain modules:
  - src/lib/domain/attendance for core check-in schemas, contracts, transforms, metadata constants
  - src/lib/domain/attendance-fields for dynamic assignment field definitions, answer schemas, and field builder contracts
- Backend:
  - Edge Functions as write path for attendance mutations and export generation
  - Read APIs for check-in attendee search are edge-mediated (DEC-004 resolved: Option B)
- Database:
  - Additive attendance tables scoped by event_id
  - Explicit separation between registration answers and assignment field answers

### Data-flow and control-flow outline

1. Attendance settings

- Admin toggles attendance option in event settings.
- UI confirms action and calls attendance settings mutation.
- Edge Function validates admin auth and event access; persists setting.
- Query invalidation refreshes event settings and attendance entry points.

2. Pre-event assignments

- Admin opens assignment field builder for one event and defines custom fields (label, type, options).
- Admin opens assignment data entry list for one event.
- Query returns registrants plus their current assignment field answers and missing-value indicators.
- Admin edits values per registrant and submits.
- Mutation upserts assignment answers and invalidates assignment queries.

3. Check-in (registered)

- Staff searches by Member ID token, name fragment, or email.
- Search query returns candidate attendees with disambiguation fields.
- Staff selects attendee and submits check-in action.
- Mutation applies First Check-In Rule:
  - If first check-in absent, set first_checked_in_at.
  - If present, keep official timestamp unchanged and return already_checked_in status.

4. Walk-in check-in

- If attendee not found and Walk-In Mode enabled, walk-in form appears.
- Form requires full name and at least one contact method.
- Mutation creates walk-in attendee entity and check-in atomically; returns checked-in result.

5. Timeslot attendance

- If Timeslot Attendance enabled, check-in requires configured slot selection for slot tracking operations.
- Mutation records slot attendance additively while preserving official first check-in timestamp.
- Slot counts and attendee lists are queryable separately from overall totals.

6. Attendance export

- Admin triggers attendance CSV export from attendance-enabled event context.
- Export function assembles dedicated attendance dataset and streams CSV.
- If no attendance rows, headers-only CSV is returned.

### Trust boundaries and security controls

- Admin UI is protected by existing admin authentication guard.
- All attendance writes run through authenticated Edge Functions with verify_jwt = true.
- Service role DB access is contained inside Edge Functions only.
- RLS remains deny-by-default for anon/authenticated on attendance tables unless explicit read is approved.
- Export endpoint enforces admin access and event scoping checks before query execution.

## Contracts

### Domain types and schema changes

Create domain packages:

- src/lib/domain/attendance/types.ts
- src/lib/domain/attendance/schemas.ts
- src/lib/domain/attendance/metadata.ts
- src/lib/domain/attendance/index.ts

- src/lib/domain/attendance-fields/types.ts
- src/lib/domain/attendance-fields/schemas.ts
- src/lib/domain/attendance-fields/metadata.ts
- src/lib/domain/attendance-fields/index.ts

Core contract shapes (attendance):

- AttendanceSettings
  - eventId: string
  - attendanceEnabled: boolean
  - walkInModeEnabled: boolean
  - timeslotEnabled: boolean
  - timeslots: string[]
  - updatedAt: string
- CheckInResult
  - success: boolean
  - status: checked_in | already_checked_in | rejected
  - officialCheckInTime: string | null
  - attendeeKind: registered | walk_in
  - message: string
- WalkInPayload
  - fullName: string
  - email: string | null
  - phone: string | null
- TimeslotAttendanceRecord
  - eventId: string
  - attendeeRef: string
  - slot: string
  - recordedAt: string

Core contract shapes (attendance-fields):

- AssignmentFieldType: 'text' | 'textarea' | 'select' | 'number'
- AssignmentField
  - id: string
  - eventId: string
  - fieldKey: string
  - label: string
  - fieldType: AssignmentFieldType
  - isRequired: boolean
  - displayOrder: number
  - options: string[]
  - validationRules: object
  - updatedAt: string
- AssignmentFieldAnswers: Record<string, unknown>

Validation rules (Zod):

- Walk-in requires fullName and at least one of email or phone (superRefine).
- Slot selection must belong to event-configured timeslots when timeslotEnabled is true.
- Assignment field answers are all optional (partial fill is valid for assignments).
- buildDynamicAssignmentResponseSchema(fields) generates a Zod object schema from AssignmentField[] — mirrors buildDynamicFieldResponseSchema from event-fields.
- Settings dependency validation:
  - walkInModeEnabled and timeslotEnabled cannot be true when attendanceEnabled is false.

### API and Edge Function request-response shapes

1. update-attendance-settings

- Request:
  - eventId
  - attendanceEnabled
  - walkInModeEnabled
  - timeslotEnabled
  - timeslots
- Response:
  - success: true
  - settings: AttendanceSettings
  - success: false
  - errorCode
  - message

2a. create-assignment-field / update-assignment-field / delete-assignment-field / reorder-assignment-fields

- Admin CRUD for dynamic assignment field definitions per event.
- Requests carry eventId plus field payload (label, fieldType, isRequired, options, displayOrder as applicable).
- Responses return success discriminator and updated AssignmentField shape.

2b. upsert-assignment-answers

- Request:
  - eventId
  - registrationId
  - answers: AssignmentFieldAnswers (Record<fieldKey, value>)
- Response:
  - success: true
  - answers: AssignmentFieldAnswers
  - success: false
  - errorCode
  - message

2c. search-attendees (DEC-004 resolved: Option B — edge-mediated read)

- Request:
  - eventId
  - query (Member ID token | name fragment | email)
- Response:
  - success: true
  - results: AttendeeSearchResult[] (includes disambiguation fields: name, memberId, email, registration status, assignment summary)
  - success: false
  - errorCode
  - message

3. check-in-attendee

- Request:
  - eventId
  - attendeeLocator (memberId | registrationId)
  - slot (optional unless slot mode operation)
- Response:
  - success: true
  - result: CheckInResult
  - success: false
  - errorCode
  - message

4. create-walk-in-check-in

- Request:
  - eventId
  - walkInIdentity
  - slot (optional)
- Response:
  - success: true
  - result: CheckInResult
  - walkInLabel: true
  - success: false
  - errorCode
  - message

5. export-attendance-csv

- Request:
  - eventId
- Response:
  - success path: CSV stream with attendance columns
  - failure path: typed error payload when export denied/invalid

### Database and migration impacts

Revised data model (decisions finalized):

- attendance_field_type enum: text, textarea, select, number
- attendee_kind enum: registered, walk_in

- attendance_settings
  - event_id primary key references events
  - attendance_enabled boolean NOT NULL DEFAULT false
  - walk_in_mode_enabled boolean NOT NULL DEFAULT false
  - timeslot_enabled boolean NOT NULL DEFAULT false
  - timeslots text[] NOT NULL DEFAULT '{}'
  - updated_at timestamptz NOT NULL DEFAULT now()

- attendance_assignment_fields (replaces attendance_assignments fixed-column table)
  - id uuid primary key
  - event_id references events ON DELETE CASCADE
  - field_key text NOT NULL
  - label text NOT NULL
  - field_type attendance_field_type NOT NULL
  - is_required boolean NOT NULL DEFAULT false
  - display_order integer NOT NULL DEFAULT 0
  - options jsonb NOT NULL DEFAULT '[]'
  - validation_rules jsonb NOT NULL DEFAULT '{}'
  - created_at timestamptz NOT NULL DEFAULT now()
  - updated_at timestamptz NOT NULL DEFAULT now()
  - unique(event_id, field_key)

- attendance_assignment_answers
  - id uuid primary key
  - registration_id references registrations ON DELETE CASCADE
  - assignment_field_id references attendance_assignment_fields ON DELETE CASCADE
  - answer_text text
  - answer_number numeric
  - created_at timestamptz NOT NULL DEFAULT now()
  - updated_at timestamptz NOT NULL DEFAULT now()
  - unique(registration_id, assignment_field_id)
  - CHECK: at least one of answer_text or answer_number is not null

- attendance_walk_ins
  - id uuid primary key
  - event_id references events ON DELETE CASCADE
  - full_name text NOT NULL
  - email text
  - phone text
  - created_at timestamptz NOT NULL DEFAULT now()

- attendance_check_ins
  - id uuid primary key
  - event_id references events ON DELETE CASCADE
  - attendee_kind attendee_kind NOT NULL
  - registration_id nullable references registrations ON DELETE CASCADE
  - walk_in_id nullable references attendance_walk_ins ON DELETE CASCADE
  - first_checked_in_at timestamptz NOT NULL
  - created_at timestamptz NOT NULL DEFAULT now()
  - unique(event_id, registration_id) WHERE registration_id IS NOT NULL
  - unique(event_id, walk_in_id) WHERE walk_in_id IS NOT NULL
  - CHECK: exactly one of registration_id or walk_in_id is not null

- attendance_slot_records
  - id uuid primary key
  - event_id references events ON DELETE CASCADE
  - check_in_id references attendance_check_ins ON DELETE CASCADE
  - slot text NOT NULL
  - recorded_at timestamptz NOT NULL DEFAULT now()
  - unique(check_in_id, slot)

Migration strategy:

- Add tables, enums, and constraints only (no destructive migration).
- Backfill attendance_settings rows lazily on first read/write or via one-time insert for existing events.

### RLS, grants, authorization implications

- attendance_settings, attendance_assignment_fields, attendance_assignment_answers, attendance_check_ins, attendance_walk_ins, attendance_slot_records:
  - deny anon by default for write and read
  - authenticated direct writes disallowed
  - service_role granted SELECT, INSERT, UPDATE, DELETE for Edge Functions
- Check-in attendee search uses edge-mediated reads (DEC-004: Option B) via search-attendees Edge Function for simpler RLS surface.
- Edge Functions must be registered in supabase/config.toml with verify_jwt = true for admin flows.

## Chunk-by-Chunk Technical Specs

### Slice EPIC-8-S1: Attendance Foundation Contracts and Storage

- Vertical slice scope:
  - Introduce attendance domain contracts, tables, and security baseline without UI behavior change.
- Estimated effort:
  - Approximately one day for one dev-agent.
- Technical objective:
  - Establish additive storage model and typed validation boundaries.
- Implementation surfaces:
  - Two domain packages (attendance + attendance-fields), migration, RLS/grants, config.toml function entries scaffold.
- Files/folders expected to change:
  - src/lib/domain/attendance/
  - src/lib/domain/attendance-fields/
  - supabase/migrations/
  - supabase/config.toml
- Contract and validation requirements:
  - Zod schemas for settings (with dependency enforcement), walk-in payload (superRefine contact check), slot payload.
  - Zod schemas for assignment field CRUD (createAssignmentFieldSchema, updateAssignmentFieldSchema).
  - buildDynamicAssignmentResponseSchema factory for dynamic answer validation.
- Dependency type:
  - Hard prerequisite.
- Dependency gates:
  - Database migration applies locally and RLS policies compile.
- Key risks and mitigations:
  - Risk: model drift between contracts and SQL schema.
  - Mitigation: derive TS types from Zod and mirror naming in SQL columns.
- Verification and test expectations:
  - Schema lint/build pass; supabase test db passes policy checks.
- Definition of ready:
  - Feature inputs confirmed and table model approved.
- Definition of done:
  - Attendance tables and domain schemas committed with passing checks.

### Slice EPIC-8-S2: Event Attendance Settings End-to-End

- Vertical slice scope:
  - Admin can enable Attendance Tracking and dependent toggles with enforcement.
- Estimated effort:
  - Approximately one day for one dev-agent.
- Technical objective:
  - Deliver 8.1 behavior with dependency validation.
- Implementation surfaces:
  - Admin event settings UI section, query/mutation hooks, update-attendance-settings function.
- Files/folders expected to change:
  - src/pages/admin/events/[id]/
  - src/hooks/domain/attendance/queries/
  - src/hooks/domain/attendance/mutations/
  - supabase/functions/update-attendance-settings/
- Contract and validation requirements:
  - Reject enabling walk-in or timeslot when attendance is disabled.
- Dependency type:
  - Hard prerequisite after S1.
- Dependency gates:
  - S1 migrations and contracts merged.
- Key risks and mitigations:
  - Risk: ambiguous save interaction.
  - Mitigation: explicit confirm-on-toggle with immediate persist and toast confirmation.
- Verification and test expectations:
  - Unit tests for settings validation; feature scenario checks for dependent toggles.
- Definition of ready:
  - Attendance settings contract finalized.
- Definition of done:
  - 8.1 scenarios pass and settings persist across reload.

### Slice EPIC-8-S3: Attendance Field Configuration

- Vertical slice scope:
  - Admin can define custom attendance fields per event, then fill in field values per registered attendee. Two-part: field schema definition + data entry UI.
- Estimated effort:
  - Approximately one to two days for one dev-agent depending on field builder complexity.
- Technical objective:
  - Deliver 8.2 behavior with dynamic field definitions replacing fixed columns.
- Implementation surfaces:
  - Attendance field configuration page (CRUD for field definitions), attendance data entry list, field query/mutation hooks, upsert answers function, field CRUD functions.
- Files/folders expected to change:
  - src/pages/admin/events/[id]/attendance/assignments/
  - src/hooks/domain/attendance-fields/queries/
  - src/hooks/domain/attendance-fields/mutations/
  - src/hooks/domain/attendance/queries/ (assignment answers query)
  - src/hooks/domain/attendance/mutations/ (upsert answers mutation)
  - supabase/functions/create-assignment-field/
  - supabase/functions/update-assignment-field/
  - supabase/functions/delete-assignment-field/
  - supabase/functions/reorder-assignment-fields/
  - supabase/functions/upsert-assignment-answers/
- Contract and validation requirements:
  - Field definitions: label required, fieldType must be AssignmentFieldType, options required for select type.
  - Assignment answers: all fields optional; validated against field definitions via buildDynamicAssignmentResponseSchema.
  - Editing blocked when attendance disabled.
- Dependency type:
  - Hard prerequisite after S2.
- Dependency gates:
  - Attendance-enabled state readable in UI and backend.
- Key risks and mitigations:
  - Risk: field configuration scope balloons similar to event-fields builder.
  - Mitigation: scope to text/textarea/select/number types only; no reordering drag-and-drop in MVP2.
- Verification and test expectations:
  - Schema tests for buildDynamicAssignmentResponseSchema with each field type.
  - UI tests for blocked state, field CRUD, and answer upsert.
- Definition of ready:
  - Attendance field type set confirmed (text, textarea, select, number).
- Definition of done:
  - 8.2 scenarios pass with field values visible in check-in context read.

### Slice EPIC-8-S4: Registered Attendee Search and Check-In

- Vertical slice scope:
  - Admin check-in by Member ID, name, and email with first-check-in invariance.
- Estimated effort:
  - Approximately one day for one dev-agent.
- Technical objective:
  - Deliver 8.3 behavior including duplicate-timestamp prevention.
- Implementation surfaces:
  - Check-in page orchestration, search-attendees Edge Function (edge-mediated read), check-in mutation/function.
- Files/folders expected to change:
  - src/pages/admin/events/[id]/attendance/check-in/
  - src/hooks/domain/attendance/queries/
  - src/hooks/domain/attendance/mutations/
  - supabase/functions/search-attendees/
  - supabase/functions/check-in-attendee/
- Contract and validation requirements:
  - Return already_checked_in status without timestamp overwrite.
  - Provide disambiguation fields for multi-match name results.
- Dependency type:
  - Hard prerequisite after S3.
- Dependency gates:
  - Assignment data must be queryable for check-in detail panel.
- Key risks and mitigations:
  - Risk: race condition on rapid repeat scans.
  - Mitigation: DB uniqueness + idempotent upsert semantics in function.
- Verification and test expectations:
  - Concurrent check-in tests assert same official timestamp.
- Definition of ready:
  - Search indexing strategy confirmed (name/email/member id columns available).
- Definition of done:
  - 8.3 scenarios pass and first-check-in rule enforced.

### Slice EPIC-8-S5: Walk-In Create-and-Check-In

- Vertical slice scope:
  - Staff can process walk-ins only when Walk-In Mode is enabled, with required identity validation.
- Estimated effort:
  - Approximately one day for one dev-agent.
- Technical objective:
  - Deliver 8.4 behavior with explicit walk-in labeling.
- Implementation surfaces:
  - Walk-in panel/form within check-in flow, create-walk-in-check-in function, walk-in tagging in attendance views.
- Files/folders expected to change:
  - src/pages/admin/events/[id]/attendance/check-in/
  - src/lib/domain/attendance/schemas.ts
  - src/hooks/domain/attendance/mutations/
  - supabase/functions/create-walk-in-check-in/
- Contract and validation requirements:
  - full_name required and at least one contact method.
  - Immediate checked-in result on successful walk-in creation.
- Dependency type:
  - Hard prerequisite after S4.
- Dependency gates:
  - Walk-In Mode toggle and check-in baseline stable.
- Key risks and mitigations:
  - Risk: duplicate walk-ins for same person.
  - Mitigation: soft de-dup warning based on normalized name plus contact before create.
- Verification and test expectations:
  - Validation tests for required fields; UI flow test for blocked versus enabled mode.
- Definition of ready:
  - Walk-in required fields confirmed from business rules.
- Definition of done:
  - 8.4 scenarios pass and flow returns immediately to next-attendee state.

### Slice EPIC-8-S6: Timeslot Attendance Add-On

- Vertical slice scope:
  - Add slot recording and slot-level summaries without changing overall attendance semantics.
- Estimated effort:
  - Approximately one day for one dev-agent.
- Technical objective:
  - Deliver 8.5 behavior with additive slot records.
- Implementation surfaces:
  - Timeslot configuration UI segment, slot selection controls, slot record mutation and summary queries.
- Files/folders expected to change:
  - src/pages/admin/events/[id]/attendance/check-in/
  - src/hooks/domain/attendance/queries/
  - src/hooks/domain/attendance/mutations/
  - supabase/functions/check-in-attendee/ (slot path)
- Contract and validation requirements:
  - Invalid slot rejected if not in configured set.
  - Official first check-in time immutable across slot actions.
- Dependency type:
  - Hard prerequisite after S2; soft sequencing after S5.
- Dependency gates:
  - Timeslot settings persisted and readable for event.
- Key risks and mitigations:
  - Risk: slot-record duplicates.
  - Mitigation: unique(check_in_id, slot) constraint with idempotent insert.
- Verification and test expectations:
  - Slot summary tests and repeated slot action invariance checks.
- Definition of ready:
  - Timeslot list source defined (event setting or static config).
- Definition of done:
  - 8.5 scenarios pass with separate slot and overall totals.

### Slice EPIC-8-S7: Attendance CSV Export

- Vertical slice scope:
  - Dedicated attendance CSV export available only for attendance-enabled events.
- Estimated effort:
  - Approximately one day for one dev-agent.
- Technical objective:
  - Deliver 8.6 behavior while preserving registration export independence.
- Implementation surfaces:
  - Export action in admin event operations, export-attendance-csv function, CSV mapping tests.
- Files/folders expected to change:
  - src/pages/admin/events/[id]/attendance/
  - src/hooks/domain/attendance/mutations/
  - supabase/functions/export-attendance-csv/
- Contract and validation requirements:
  - Include identity, attendance status, official check-in time, assignment fields, walk-in marker.
  - Return headers-only CSV when no rows exist.
- Dependency type:
  - Hard prerequisite after S3 and S4; parallel-safe with S6 once base attendance records exist.
- Dependency gates:
  - Attendance records and assignment joins accessible in export query.
- Key risks and mitigations:
  - Risk: regression to registration export pipeline.
  - Mitigation: separate function and route; no shared mutable formatter assumptions.
- Verification and test expectations:
  - Golden-file CSV tests for populated and empty datasets.
- Definition of ready:
  - Final export column set signed off.
- Definition of done:
  - 8.6 scenarios pass and registration export remains unchanged.

## Decision Log

- DEC-001 (validated): Use dedicated attendance tables instead of embedding attendance data in registration answers.
  - Rationale: preserves Field Snapshot Rule and clean domain separation.
  - Alternatives considered: JSONB in registrations metadata (rejected for coupling and query complexity).

- DEC-002 (validated): Enforce First Check-In Rule at database and function layers.
  - Rationale: race-safe invariance under rapid repeat actions.
  - Alternatives considered: frontend-only duplicate prevention (rejected as unsafe).

- DEC-003 (validated): Keep event-day writes in Edge Functions with verify_jwt true.
  - Rationale: aligns with secure write boundary and admin trust model.
  - Alternatives considered: direct client writes under RLS (rejected for increased policy surface).

- DEC-004 (open): Choose direct Supabase reads with admin RLS versus edge-mediated read endpoints for check-in search.
  - Recommendation: start with direct reads if existing admin RLS patterns are already established; otherwise use edge-mediated reads for lower policy complexity.

- DEC-005 (validated): Timeslot records are additive and separate from official first check-in timestamp.
  - Rationale: directly mapped to 8.5 business rules.

- ASM-001 (validated): Admin-only event-day operations in MVP2.
- ASM-002 (validated): Delivery baseline is one dev-agent, sequential, approximately one day per slice.
- ASM-003 (open): Confirm maximum allowed assignment field lengths for table/area/team-color/area-leader UI limits.

## Delivery Readiness

### Implementation order

1. EPIC-8-S1 Attendance foundation
2. EPIC-8-S2 Attendance settings
3. EPIC-8-S3 Assignment management
4. EPIC-8-S4 Registered check-in
5. EPIC-8-S5 Walk-in check-in
6. EPIC-8-S6 Timeslot attendance
7. EPIC-8-S7 Attendance CSV export

### Parallelization opportunities

- Under a single-agent baseline, execute sequentially.
- If capacity expands to two implementers:
  - S6 and S7 can run in parallel after S4 and base contracts are stable.

### Pre-implementation checklist

- Confirm DEC-004 and ASM-003.
- Finalize CSV column header names and ordering.
- Confirm event admin route placement for attendance pages.
- Confirm supabase/config.toml function entries and jwt settings before coding.

### Handoff guidance for engineers

- Start each slice by locking contracts and tests first, then UI wiring.
- Keep query keys centralized and invalidate only affected attendance keys.
- Do not modify existing registration export codepaths while implementing attendance export.

## Dev-Agent Handoff Pack

### Start task for next implementation session

- Start with EPIC-8-S1 and deliver attendance schema + domain contract baseline in one PR.

### Ordered implementation steps

1. Create attendance domain module and Zod schemas.
2. Add SQL migration for attendance tables and constraints.
3. Add RLS/grants and validate deny-by-default posture.
4. Register planned attendance functions in supabase/config.toml.
5. Add minimal hook stubs and compile checks for downstream slices.

### File touch plan

- src/lib/domain/attendance/
- src/hooks/domain/attendance/queries/
- src/hooks/domain/attendance/mutations/
- src/pages/admin/events/[id]/attendance/
- supabase/migrations/
- supabase/functions/
- supabase/config.toml

### Validation commands and expected outcomes

- npm run build
  - Expected: successful type-safe build
- npm run format:check
  - Expected: formatting and lint gates pass
- supabase test db
  - Expected: migration and RLS tests pass with no attendance policy regressions

### Rollback notes and safe fallback

- If attendance migration issues occur, rollback only new attendance migration files; do not alter existing registration schema.
- If check-in mutation behavior is unstable, disable attendance UI entry points by keeping attendance_enabled false while preserving deployed schema.
- If CSV export fails in production, hide export action feature-flag style at UI layer and keep core check-in operational.
