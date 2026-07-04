## MVP2 Implementation Plan: Event-Day Attendance

### Session Constraint

- This document is planning-only for MVP2.
- No coding or implementation execution is in scope for this session.

### Context

- MVP1 plan has been completed and moved to `mvp-1`.
- This plan defines MVP2 scope for attendance operations: pre-event assignments, event-day check-in, and post-event export.

### MVP2 Outcome

Deliver a complete design and delivery plan for attendance tracking that can be handed off to a future build session with minimal ambiguity.

### Scope

- In scope:
- Admin-only check-in in MVP2
- Attendance enablement per event
- Walk-in policy toggle per event
- Optional timeslot attendance behavior
- Separate attendance export (not merged into registrations export)
- Bulk CSV edit of attendance field answers
- Out of scope (deferred):
- Non-admin assigned-staff authorization model
- Advanced timeslot UX beyond baseline functionality

### Planning Artifacts To Produce

1. Finalized phased delivery plan with dependencies and exit criteria.
2. Data model decision record for attendance entities and timeslot strategy.
3. API contract outline for check-in, walk-in, and attendance export functions.
4. UI flow map for assignments, check-in, and reporting screens.
5. QA strategy and acceptance matrix tied to feature scenarios.

### Workstream Lanes (Planning Ownership)

- Product/Feature: finalize scenario priorities and acceptance boundaries.
- Data/Security: define schema, RLS model, grants, and invariants.
- Backend/API: define edge function responsibilities and response contracts.
- Frontend UX: define routes, page composition, hook responsibilities, and state flows.
- QA/Release: define test matrix, gate criteria, and rollout plan.

### Phase Plan

#### Phase 1: Discovery and Design Baseline

Goal:
Establish architecture and decision baseline for attendance.

Planning tasks:

1. Confirm authoritative requirements from feature spec and glossary terms.
2. Define data model options and select preferred approach.
3. Define attendance state model and first-check-in invariance rules.
4. Map dependencies on current event metadata and registration flows.

Exit criteria:

1. Data model option selected and documented.
2. Invariants documented, including duplicate-check handling.
3. Dependency map completed.

#### Phase 2: Contracts and Boundaries

Goal:
Lock technical boundaries before implementation.

Planning tasks:

1. Define schema plan for attendance entities and relationships.
2. Define RLS and permission strategy at table level.
3. Draft API contracts for:
4. Check-in by RFID/name/email
5. Walk-in create-and-check-in
6. Attendance CSV export
7. Define metadata contract changes for event-level attendance toggles.

Exit criteria:

1. API request/response contracts reviewed.
2. Security model approved.
3. Metadata contract changes approved.

#### Phase 3: UX and Orchestration Plan

Goal:
Define admin user flow and screen orchestration.

Planning tasks:

1. Define information architecture for attendance routes.
2. Define check-in flow states (success, duplicate, not found, walk-in allowed/blocked).
3. Define assignment management flow and editable field strategy.
4. Define export flow expectations and output column mapping.

Exit criteria:

1. UI flow diagrams or state maps completed.
2. Hook and page responsibility map completed.
3. Edge-case handling matrix completed.

#### Phase 4: Delivery Sequencing and Risk Control

Goal:
Create a build-ready backlog with clear order and mitigations.

Planning tasks:

1. Sequence implementation slices from lowest-risk foundation to end-to-end workflow.
2. Define parallelizable workstreams and dependency constraints.
3. Define risk register with mitigation plans.
4. Define quality gates for implementation readiness.

Exit criteria:

1. Sprint-ready backlog ordering agreed.
2. Risk register and mitigations accepted.
3. Implementation kickoff checklist approved.

#### Phase 4.5: Bulk CSV Edit Feature

Goal:
Plan CSV bulk edit workflow for efficient large-scale attendance data updates.

Planning tasks:

1. Confirm bulk edit scope: attendance answers only (no registration or walk-in data).
2. Define CSV format: columns (registration_id, full_name, email, member_id, attendance_fields...).
3. Define import validation strategy: atomic failure (reject all if any row invalid).
4. Define merge strategy: overwrite (replace all answers, not merge).
5. Plan Edge Function contract for bulk upsert with row-level validation.
6. Plan download/upload UI components and integration with attendance data page.

Exit criteria:

1. CSV format finalized and documented.
2. Validation error handling strategy defined.
3. Edge Function contract approved.
4. UI/UX mockups or flow diagrams completed.

### Dependencies

- Existing event metadata structure and mutation patterns.
- Existing admin auth and protected route boundaries.
- Existing registration read models used for attendee context.
- Existing CSV export patterns for consistency.
- CSV export patterns from existing registrations export feature.
- Attendance field schema and validation from attendance-fields domain.
- Bulk file upload/download patterns (currently only single-row modal editing exists).

### Key Risks and Mitigations

1. Risk: Scope creep from deferred staff authorization.
   Mitigation: Keep explicit MVP2 admin-only boundary in acceptance criteria.
2. Risk: Ambiguity in timeslot model choice.
   Mitigation: Make a hard decision checkpoint before implementation kickoff.
3. Risk: Unclear walk-in identity requirements at door.
   Mitigation: Define minimum required walk-in fields in contract phase.
4. Risk: Regression risk to current registration/export behavior.
   Mitigation: Treat compatibility as a non-negotiable release gate.

### Decision Checkpoints

1. Data model choice:
1. Dedicated attendance timeslot table
1. JSON-only timeslot metadata
1. Assignment model choice:
1. Hybrid fixed columns plus JSON extras
1. Fully dynamic JSON-only assignments
1. Walk-in identity policy:
1. Minimal required fields
1. Full profile at check-in

### Implementation Readiness Gate (Planning Complete)

Planning is considered complete when all conditions below are true:

1. Phases 1-4 exit criteria are met.
2. Decision checkpoints are resolved and recorded.
3. Backlog sequence and owners are assigned.
4. Acceptance matrix is mapped to the feature scenarios.
5. A separate implementation session is scheduled.

### Notes

- This file is the active MVP2 planning document.
- Implementation coding begins only in a future session.
