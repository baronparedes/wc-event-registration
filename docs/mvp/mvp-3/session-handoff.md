# MVP3 Session Handoff

Last updated: 2026-07-16
Owner baseline: 1 dev-agent, sequential execution
Scope: MVP3 Google OAuth account access

## Pause Snapshot

- Current state: planning complete, implementation not yet started.
- Next session to start: Session 1 (MVP3-S1 Access model and invite contracts).
- Confirmed scope:
  - invite-only access
  - manual admin invite creation
  - invite linked to email and person record before first sign-in
  - Google OAuth added alongside the existing admin email/password login
  - Member and SLOD users share one account area with role-based visibility

## Execution Baseline

- Each session is sized for approximately one day.
- Sessions are ordered by hard dependency.
- Do not widen scope to public sign-up, passwordless auth, or admin auth replacement.
- Keep the current admin login flow intact while MVP3 is added.

## Resolved Decisions

1. DEC-MVP3-001: Keep Google OAuth invite-only.

   - **Resolved**: Access is only granted after an admin-created invite matches the signing-in email.

1. DEC-MVP3-002: Keep admin email/password login alongside Google OAuth.

   - **Resolved**: Existing admin login remains in place and is not replaced by MVP3.

1. DEC-MVP3-003: Use a person-linked invite as the authorization source of truth.

   - **Resolved**: Invite records are the access gate for first sign-in and are tied to a specific person record.

1. DEC-MVP3-004: Treat SLOD as provisional glossary terminology.

   - **Resolved**: SLOD is allowed in MVP3 planning and implementation, but the glossary term should be finalized before release.

## Session Plan

## Session 1 - MVP3-S1 Access Model and Invite Contracts

Goal:

- Lock the account model, invite lifecycle, and role contracts before UI or provider work.

Checklist:

- [ ] Confirm canonical account terms for Member and SLOD
- [ ] Finalize invite states: pending, accepted, revoked, expired
- [ ] Define invite-to-person linkage rules
- [ ] Define normalized email matching rules
- [ ] Add or update domain contracts for invite and landing target shapes
- [ ] Confirm the current admin login is unaffected

Expected file touch zones:

- src/lib/domain/\*\*
- docs/mvp-3/\*\*
- .github/instructions/domain-glossary.instructions.md

Validation gate:

- [ ] Contract review passes against the feature docs
- [ ] No glossary conflicts remain for MVP3 terms

Exit criteria:

- Account and invite contracts are stable enough to drive implementation.

## Session 2 - MVP3-S2 Supabase OAuth Entry and Callback Flow

Goal:

- Make Google sign-in work through Supabase and return a usable session to the app.

Checklist:

- [ ] Configure the Google provider in Supabase
- [ ] Define the callback route and redirect targets
- [ ] Add the Google sign-in entry point to the login surface
- [ ] Preserve intended destination after auth completion
- [ ] Keep the current admin login path unchanged

Expected file touch zones:

- src/pages/\*\*
- src/app/\*\*
- src/lib/infrastructure/\*\*
- supabase/config.toml

Validation gate:

- [ ] Google sign-in completes and returns a session
- [ ] Redirect lands on the intended route

Exit criteria:

- OAuth entry and callback behavior are functional and repeatable.

## Session 3 - MVP3-S3 Invite Acceptance and Authorization Gate

Goal:

- Block uninvited users and accept matched invites on first successful sign-in.

Checklist:

- [ ] Check Google email against the invite record
- [ ] Accept a pending invite on first successful access
- [ ] Deny access for revoked, expired, and missing invites
- [ ] Return safe error states for denied access
- [ ] Ensure access decision happens before role-specific data is shown

Expected file touch zones:

- src/hooks/domain/\*\*
- src/lib/domain/\*\*
- supabase/functions/\*\* if secure lookup or acceptance is needed

Validation gate:

- [ ] Invited user is allowed
- [ ] Uninvited user is denied
- [ ] Revoked invite is denied
- [ ] Expired invite is denied

Exit criteria:

- Invite enforcement is the active authorization gate.

## Session 4 - MVP3-S4 Role-Based Account Area and Admin Invite Workflow

Goal:

- Route users to the correct account area and let admins create/manage invites.

Checklist:

- [ ] Build Member landing behavior
- [ ] Build Stakeholder landing behavior
- [ ] Hide role-inappropriate sections in the account area
- [ ] Add admin invite creation workflow
- [ ] Add admin revoke and resend actions if they are part of the first release

Expected file touch zones:

- src/pages/\*\*
- src/components/\*\* or route-local components
- src/hooks/domain/\*\*
- docs/features/9-account-access/\*\*

Validation gate:

- [ ] Member lands in member area
- [ ] Stakeholder lands in stakeholder area
- [ ] Admin can create an invite for a person record

Exit criteria:

- Role-specific account areas and invite management are end to end.

## Session 5 - MVP3-S5 Validation, Rollout, and Hardening

Goal:

- Verify the flow end to end and document safe release behavior.

Checklist:

- [ ] Add or confirm tests for invited, uninvited, revoked, and expired users
- [ ] Add route guard validation for protected areas
- [ ] Confirm the admin login regression surface is unchanged
- [ ] Write rollout and rollback notes
- [ ] Confirm the glossary term for SLOD before release if needed

Expected file touch zones:

- src/\*\*
- docs/mvp-3/\*\*
- docs/features/README.md

Validation gate:

- [ ] Relevant test slice passes
- [ ] No regression in existing admin auth behavior

Exit criteria:

- MVP3 is ready for staged rollout or release gating.

## Dependencies

- Supabase project configuration
- Existing admin auth and protected route behavior
- Existing member profile model
- Approved MVP3 scope and role naming

## Key Risks and Mitigations

1. Risk: the new Google flow replaces admin login.
   Mitigation: keep the current login path intact and isolate the new flow.
2. Risk: invite access is too permissive.
   Mitigation: require exact invite match and enforce blocked states.
3. Risk: role terminology is unclear.
   Mitigation: finalize the glossary before release.
4. Risk: callback misconfiguration breaks sign-in.
   Mitigation: validate provider and redirect settings before rollout.

## Implementation Readiness Gate

- Implementation is ready when:
  1. Session 1 contracts are finalized.
  2. Supabase provider settings are available.
  3. Test and rollback expectations are known.
  4. The first implementation session is scheduled.
