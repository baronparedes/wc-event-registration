# MVP3 Technical Design: Google OAuth Account Access

## Source Inputs

- Reviewed feature docs:
  - docs/features/2-admin-authentication/2.1-admin-login.feature
  - docs/features/7-system-features/7.1-auth-protection.feature
  - docs/features/6-admin-members/6.2-view-member-details.feature
- Reviewed repository constraints:
  - `.github/instructions/domain-glossary.instructions.md`
  - `.github/copilot-instructions.md`
- Planning input from this session:
  - Google OAuth is MVP3 scope
  - access stays invite-only
  - invites are manually created by an admin
  - invite is tied to a specific email and person record before first sign-in
  - Google is added alongside the existing email/password admin login
  - Member and SLOD users share one account area with role-based visibility

### Canonical term note

- Member is canonical.
- SLOD is not currently defined in the glossary and should be treated as a provisional stakeholder-access label until the domain glossary is updated.

## Architecture Scope

- Target epic/chunk: MVP3 / Google OAuth invite-based account access
- In scope:
  - Google OAuth sign-in through Supabase Auth
  - invite-only first sign-in
  - manual invite creation by admin
  - account-to-person linkage by email
  - role-aware landing and visibility for Member and SLOD users
  - compatibility with the current admin email/password login
- Out of scope:
  - replacing admin email/password login
  - public self-service account creation
  - password reset or passwordless login flows
  - automatic domain-based approval
  - merging identities across multiple emails
  - member profile editing permissions

## System Design

### Component and module boundaries

- Frontend orchestration:
  - login entry points remain route-level pages
  - post-auth routing is responsible only for directing users to the correct role area
- Domain contracts:
  - add a dedicated auth/account contract module for invite state, role mapping, and landing targets
  - keep member profile data in the existing member domain
- Backend and auth:
  - Supabase Auth handles Google OAuth session creation
  - a secure backend path validates invite eligibility and role mapping before the app grants access
- Data storage:
  - preserve the existing member record as the person anchor where applicable
  - store invite metadata separately from the person record
  - keep auth identity separate from business profile data

### Data-flow and control-flow outline

1. Admin creates an invite.
   - Admin selects a person record and email.
   - System stores invite state as pending and ties it to the target role.

2. User signs in with Google.
   - Supabase Auth returns a Google identity and email.
   - App checks whether that email matches a pending invite.

3. Access is granted or blocked.
   - If the invite exists and the email matches, the user enters the app.
   - If no invite exists, access is denied with a safe error.
   - If the invite is already accepted, the user resumes the existing account.

4. Role-based landing.
   - Member users land in the member area.
   - SLOD users land in the stakeholder area.
   - Admin auth behavior remains unchanged for the existing admin path.

### Trust boundaries and security controls

- Google identity is trusted only for authentication, not authorization.
- Invite records remain the source of truth for access approval.
- Access checks must happen before role-specific data is rendered.
- Public frontend code must not be able to create or approve its own invite.
- Existing admin protection and auth guards stay intact.

## Contracts

### Domain types and schema changes

Recommended contract shapes:

- AccountInvite
  - id: string
  - email: string
  - personId: string
  - role: member | slod | admin
  - status: pending | accepted | revoked | expired
  - createdAt: string
  - acceptedAt: string | null
- AuthenticatedAccount
  - userId: string
  - email: string
  - role: member | slod | admin
  - personId: string | null
  - isInviteMatched: boolean
- AccountLandingTarget
  - role: member | slod | admin
  - path: string

Validation requirements:

- email must be normalized before invite comparison
- invite status must be pending or accepted for access
- personId must exist before an invite can be activated
- role must be one of the supported access roles

### API and auth response shapes

- invite lookup result:
  - success: true
  - matched: boolean
  - invite: AccountInvite | null
- sign-in result:
  - success: true
  - account: AuthenticatedAccount
  - landingPath: string
  - success: false
  - errorCode
  - message

### Database and migration impacts

Preferred data model direction:

- add a dedicated invite table for Google-linked access control
- keep identity linkage separate from member profile fields
- record accepted invite state so first sign-in is auditable
- keep admin auth tables and logic separate from member/SLOD access

### RLS and authorization implications

- invite records should only be readable and writable by authorized admins
- member and SLOD data should be filtered by linked person identity and role
- no unauthenticated access to invite metadata
- Supabase auth sessions alone are not enough; role checks must still be enforced

## Chunk-by-Chunk Technical Specs

### MVP3-S1: Access model and invite contracts

- Vertical slice scope: define the invite-backed Google access model end to end on paper and in domain contracts.
- Estimated effort: approximately one day for one dev or dev agent.
- Technical objective: lock the identity, invite, and role mapping model before UI work.
- Implementation surfaces:
  - lib/domain contracts
  - database shape proposal
  - auth acceptance rules
- Files/folders expected to change:
  - src/lib/domain/auth/\*\*
  - docs/mvp-3/\*\*
- Contract and validation requirements:
  - invite email must match normalized Google email
  - role must resolve to a landing target
  - invite must be tied to a person record
- Dependency type: hard prerequisite
- Dependency gates:
  - canonical role names confirmed
  - invite approval rule confirmed
- Key risks and mitigations:
  - risk: ambiguous role semantics; mitigation: keep SLOD provisional until glossary update
  - risk: overloading member profile as auth identity; mitigation: keep identity and profile linked but distinct
- Verification and test expectations:
  - contract review against existing auth and member docs
- Definition of ready:
  - role set and invite lifecycle are agreed
- Definition of done:
  - invite, account, and landing contracts are documented and stable

### MVP3-S2: Supabase OAuth entry and callback flow

- Vertical slice scope: Google sign-in works through Supabase and returns a verified session.
- Estimated effort: approximately one day for one dev or dev agent.
- Technical objective: establish provider configuration and sign-in redirect behavior.
- Implementation surfaces:
  - auth provider wiring
  - login page entry point
  - callback handling
- Files/folders expected to change:
  - src/pages/\*\*
  - src/app/\*\*
  - src/lib/infrastructure/\*\*
- Contract and validation requirements:
  - only allowed provider is Google for this MVP3 path
  - callback must preserve the intended destination
- Dependency type: hard prerequisite
- Dependency gates:
  - Supabase provider configuration available
  - redirect URLs agreed
- Key risks and mitigations:
  - risk: callback loops or broken redirects; mitigation: keep callback path explicit and test in one browser session
  - risk: provider misconfiguration; mitigation: validate environment setup before UI rollout
- Verification and test expectations:
  - sign-in happy path and redirect path review
- Definition of ready:
  - provider settings and callback route are known
- Definition of done:
  - session creation and redirect flow are documented and testable

### MVP3-S3: Invite acceptance and authorization gate

- Vertical slice scope: invited Google users are matched to a person record and non-invited users are blocked.
- Estimated effort: approximately one day for one dev or dev agent.
- Technical objective: enforce invite-only access at the first authenticated entry.
- Implementation surfaces:
  - invite lookup
  - access gate
  - error states for unmatched accounts
- Files/folders expected to change:
  - src/hooks/domain/\*\*
  - src/lib/domain/\*\*
  - supabase/functions/\*\* if a secure backend step is needed
- Contract and validation requirements:
  - pending invite required for first access
  - accepted invite becomes the persistent link to the person record
  - unmatched email must produce a safe denial state
- Dependency type: hard prerequisite
- Dependency gates:
  - invite data model exists
  - normalized email comparison rule agreed
- Key risks and mitigations:
  - risk: account takeover by email collision; mitigation: require exact invite match and approved first login
  - risk: stale invites; mitigation: include expiry and revocation semantics
- Verification and test expectations:
  - invited user allowed
  - uninvited user denied
  - revoked invite denied
- Definition of ready:
  - access decision matrix is finalized
- Definition of done:
  - authorization gate is unambiguous and documented

### MVP3-S4: Role-based account area and admin invite workflow

- Vertical slice scope: Member and SLOD users land in the correct area, and admins can issue invites manually.
- Estimated effort: approximately one day for one dev or dev agent.
- Technical objective: close the loop from invite creation to role-specific landing.
- Implementation surfaces:
  - admin invite UI or action
  - role-aware landing pages
  - visibility rules for account areas
- Files/folders expected to change:
  - src/pages/\*\*
  - src/components/\*\* or page-local components
  - docs/mvp-3/\*\*
- Contract and validation requirements:
  - role determines landing target
  - role-based visibility must not reveal unauthorized data
- Dependency type: parallel-safe after MVP3-S1
- Dependency gates:
  - landing targets defined
  - role visibility matrix approved
- Key risks and mitigations:
  - risk: role blur between Member and SLOD; mitigation: keep a strict visibility matrix
  - risk: admin invite flow becomes too broad; mitigation: keep manual creation only for MVP3
- Verification and test expectations:
  - role-based landing
  - invited-account creation path
  - access denial for role mismatch
- Definition of ready:
  - landing rules and visibility rules are approved
- Definition of done:
  - invited users reach the correct experience and no extra role data is exposed

## Decision Log

- DEC-MVP3-001: Keep Google OAuth invite-only.
  - Status: validated
  - Rationale: preserves manual control and avoids public self-service sign-up.
- DEC-MVP3-002: Keep admin email/password login alongside Google OAuth.
  - Status: validated
  - Rationale: avoids a breaking auth migration and matches the current scope discussion.
- DEC-MVP3-003: Use a person-linked invite as the authorization source of truth.
  - Status: validated
  - Rationale: makes first sign-in deterministic and auditable.
- DEC-MVP3-004: Treat SLOD as provisional glossary terminology.
  - Status: open
  - Rationale: the domain glossary does not yet define it.

## Delivery Readiness

- Implementation order:
  1. Finalize invite and role contracts.
  2. Configure Google OAuth in Supabase.
  3. Implement invite acceptance and denial paths.
  4. Add role-based landing and admin invite actions.
  5. Harden tests and rollout checks.
- Parallelization opportunities:
  - auth provider setup and domain contract drafting can proceed in parallel after the invite model is fixed
  - landing-page UI can be prototyped while access gate semantics are finalized
- Pre-implementation checklist:
  - provider configuration confirmed
  - redirect URLs confirmed
  - canonical role names confirmed
  - invite lifecycle confirmed
  - save path confirmed
- Handoff guidance for engineers:
  - treat the invite model as the lock point
  - do not widen scope to passwordless or public registration
  - preserve current admin auth behavior while MVP3 lands

## Dev-Agent Handoff Pack

- Start task for the next implementation session:
  - implement the invite-backed Google auth contract and redirect flow without changing admin login behavior
- Ordered implementation steps:
  1. Add domain contracts for invite and role mapping.
  2. Wire Supabase Google provider configuration.
  3. Implement invite match and first-login acceptance.
  4. Add role-aware landing and denial states.
  5. Add tests for invited, uninvited, revoked, and role-mismatch users.
- File touch plan:
  - src/lib/domain/auth/\*\*
  - src/pages/\*\*
  - src/hooks/domain/\*\*
  - docs/mvp-3/\*\*
- Validation commands and expected outcomes:
  - run the relevant test slice for auth and route guards
  - run a typecheck or lint pass on touched files
  - expected outcome: no auth regressions in the existing admin path
- Rollback notes and safe fallback:
  - keep the current admin login path untouched until MVP3 is fully validated
  - if provider setup is incomplete, gate the Google entry point behind a feature flag or hide the button
