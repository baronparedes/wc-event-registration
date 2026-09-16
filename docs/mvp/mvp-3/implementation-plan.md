# MVP3 Implementation Plan: Google OAuth Account Access

## Session Constraint

- This document is planning-only for MVP3.
- No product code is implemented in this document.

## Context

- MVP3 covers invite-based account access through Google OAuth and Supabase.
- Current confirmed scope from this session:
  - invite-only access
  - manual invite creation by admin
  - invite tied to a person record and email before first sign-in
  - Google OAuth added alongside the existing admin email/password login
  - Member and SLOD users share one account area with role-based visibility

## MVP3 Outcome

Deliver a build-ready plan for Google-based account access that can be handed to engineering in phases without changing the current admin login flow.

## Scope

- In scope:
  - Google OAuth setup in Supabase
  - invite-backed first sign-in
  - role resolution for Member and SLOD
  - role-aware landing and access gating
  - manual admin invite workflow
  - tests for allowed, denied, revoked, and mismatch cases
- Out of scope:
  - replacing the current admin email/password login
  - public self-service sign-up
  - domain allowlist approval as the primary control
  - member profile editing permissions
  - self-service invite requests

## Planning Artifacts To Produce

1. Final technical design for invite-backed Google access.
2. Phase-by-phase implementation plan with dependencies.
3. Validation and test matrix for authenticated and denied flows.
4. Role visibility matrix for Member and SLOD areas.
5. Rollout and rollback notes for the first release.

## Workstream Lanes

- Product/Feature: confirm role semantics and acceptance boundaries.
- Data/Security: define invite lifecycle, linkage model, and access rules.
- Backend/Auth: define Supabase provider configuration and secure invitation checks.
- Frontend UX: define entry points, callback handling, and role landing behavior.
- QA/Release: define test matrix, rollout gate, and fallback plan.

## Phase Plan

### Phase 1: Discovery and contract baseline

Goal:
Lock the account and invite model before implementation.

Planning tasks:

1. Confirm the person-record source of truth for invited accounts.
2. Define invite states: pending, accepted, revoked, expired.
3. Confirm the role set for MVP3: Member and SLOD.
4. Define how existing admin login remains unchanged.
5. Map the auth boundary between authentication and authorization.

Exit criteria:

1. Invite lifecycle is documented.
2. Role mapping is documented.
3. Admin login coexistence is explicitly confirmed.

### Phase 2: Supabase and auth wiring

Goal:
Define the Google OAuth provider and callback flow.

Planning tasks:

1. Confirm Supabase Google provider settings and redirect URLs.
2. Define the sign-in entry point and callback route.
3. Define how the authenticated session is checked against invite state.
4. Define the denial path for uninvited or revoked users.
5. Define how intended destination is preserved after sign-in.

Exit criteria:

1. Provider and redirect settings are approved.
2. Callback behavior is defined.
3. Denial behavior is defined.

### Phase 3: Invite creation and first-login acceptance

Goal:
Define the manual admin workflow and account linkage rules.

Planning tasks:

1. Define the admin action for creating an invite.
2. Define required fields: email, person record, role.
3. Define how first sign-in converts a pending invite into an accepted link.
4. Define duplicate invite and stale invite handling.
5. Define audit data recorded when an invite is accepted.

Exit criteria:

1. Manual invite workflow is documented.
2. Acceptance and audit rules are documented.
3. Duplicate and stale invite rules are documented.

### Phase 4: Role-based landing and visibility

Goal:
Define the user experience after sign-in.

Planning tasks:

1. Define Member landing path.
2. Define SLOD landing path.
3. Define which sections are visible in the shared account area.
4. Define which data is hidden from each role.
5. Define the behavior when a role does not match the invite.

Exit criteria:

1. Role visibility matrix is approved.
2. Landing path rules are approved.
3. Mismatch behavior is documented.

### Phase 5: Validation and release hardening

Goal:
Create the test and release plan for MVP3.

Planning tasks:

1. Define happy-path and failure-path tests.
2. Define route guard tests for authenticated and unauthenticated users.
3. Define rollback behavior if provider setup is incomplete.
4. Define rollout sequencing for internal verification first.
5. Define the release gate for sign-off.

Exit criteria:

1. Test matrix is complete.
2. Rollout and rollback notes are complete.
3. Release gate is approved.

## Dependencies

- Existing Supabase project configuration.
- Existing admin auth and route protection behavior.
- Existing member profile data model.
- Existing login and session handling patterns.
- Approval on role naming, especially the provisional SLOD term.

## Key Risks and Mitigations

1. Risk: the new Google flow accidentally replaces admin login.
   Mitigation: keep admin auth untouched and isolate the new entry points.
2. Risk: invite logic becomes permissive.
   Mitigation: require exact invite match before access is granted.
3. Risk: role semantics are unclear.
   Mitigation: freeze the Member and SLOD visibility matrix before build.
4. Risk: callback misconfiguration blocks sign-in.
   Mitigation: validate provider settings before implementation starts.

## Decision Checkpoints

1. Invite lifecycle model.
2. Canonical role names.
3. Callback and redirect path.
4. Admin coexistence strategy.
5. Visibility matrix for Member and SLOD.

## Implementation Readiness Gate

- Planning is considered complete when all conditions below are true:
  1. Invite model is approved.
  2. Supabase provider settings are approved.
  3. Role visibility matrix is approved.
  4. Denial and fallback behaviors are approved.
  5. A build session is scheduled.

## Session Plan

This plan is split into one-session slices so implementation can proceed in sequence without widening scope.

Session order:

1. Session 1 - MVP3-S1 Access model and invite contracts
2. Session 2 - MVP3-S2 Supabase OAuth entry and callback flow
3. Session 3 - MVP3-S3 Invite acceptance and authorization gate
4. Session 4 - MVP3-S4 Role-based account area and admin invite workflow
5. Session 5 - MVP3-S5 Validation, rollout, and hardening

Dependency rule:

- Sessions 1-3 are hard prerequisites for the role-based account area work.
- Session 5 should close the sequence only after the earlier slices are validated.

## Session Handoff

- Detailed session-by-session execution notes live in [docs/mvp-3/session-handoff.md](session-handoff.md).
