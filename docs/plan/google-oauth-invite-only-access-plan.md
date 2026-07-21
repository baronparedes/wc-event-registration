## Plan: Google OAuth Invite-Only Access

Deliver end-to-end Google OAuth for Member/SLOD with strict invite-only authorization, while keeping current admin email/password login unchanged. Reuse the existing auth query/mutation and route-guard patterns, then layer OAuth entry, callback handling, invite gate, and role-based landing in small verifiable phases.

**Steps**

1. Phase 1 - Baseline and contract lock
1. Confirm role vocabulary and lifecycle from current docs (Member, SLOD, invite states pending/accepted/revoked/expired) and freeze acceptance matrix for allowed/denied states.
1. Define final OAuth boundary: Google handles authentication; invite match handles authorization; unmatched/revoked/expired users are denied after callback and signed out.
1. Capture landing map by role (Member area vs SLOD area) and explicit non-goal: no change to admin password flow.
1. Phase 2 - OAuth entry and callback orchestration (depends on Phase 1)
1. Add a Google sign-in entry in login orchestration without removing current admin login form path.
1. Add callback route orchestration that resolves Supabase session from OAuth return, normalizes email, performs invite-check call, then routes by resolved role.
1. Add explicit failure branches for no invite, revoked invite, expired invite, and role mismatch; ensure denial UX is safe and non-enumerating.
1. Phase 3 - Invite authorization gate (depends on Phase 2)
1. Implement secure invite-check path (read through backend-authorized path only) with normalized email comparison and deterministic state transitions.
1. Persist first successful acceptance marker and person linkage; make re-entry idempotent for already accepted invites.
1. Ensure client-side data access is blocked until invite authorization result is known.
1. Phase 4 - Role routing and account-area protection (depends on Phase 3)
1. Add role-aware route guard for account area (separate from existing admin guard) and enforce least-privilege visibility for Member vs SLOD.
1. Keep admin routing and RequireAdminAuth behavior intact; avoid shared state coupling between admin guard and account guard.
1. Phase 5 - QA hardening and rollout readiness (depends on Phases 2-4)
1. Validate manual QA matrix for happy path, uninvited denial, revoked denial, expired denial, callback retry/idempotency, and sign-out recovery.
1. Validate no regression on existing admin password login and protected admin pages.
1. Produce rollout checklist: provider config validated, redirect URLs validated, invite lifecycle validated, denial UX validated.

**Parallelism and dependencies**

1. Parallel-safe: prepare role visibility matrix while OAuth callback wiring is being implemented.
1. Blocking: invite authorization gate cannot finalize until callback contract and normalized email rule are locked.
1. Blocking: final QA signoff requires both account guard and denial paths complete.

**Relevant files**

- /Users/baronparedes/Documents/projects/wc-event-registration/docs/mvp-3/technical-design-google-oauth.md — Source architecture decisions and risk model to keep scope aligned.
- /Users/baronparedes/Documents/projects/wc-event-registration/docs/mvp-3/implementation-plan.md — Existing phased sequence to reuse as baseline.
- /Users/baronparedes/Documents/projects/wc-event-registration/docs/features/9-account-access/9.1-manage-google-access-invites.feature — Invite creation/management acceptance behavior.
- /Users/baronparedes/Documents/projects/wc-event-registration/docs/features/9-account-access/9.2-google-sign-in.feature — OAuth sign-in scenarios.
- /Users/baronparedes/Documents/projects/wc-event-registration/docs/features/9-account-access/9.3-invite-access-protection.feature — Denial and protection scenarios.
- /Users/baronparedes/Documents/projects/wc-event-registration/docs/features/9-account-access/9.4-role-based-account-area.feature — Role landing and visibility behavior.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/pages/admin/login/index.tsx — Existing login orchestration pattern and insertion point for Google entry.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/app/router.tsx — Existing guard pattern and route wiring for callback/account guards.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/lib/infrastructure/supabase.ts — Supabase auth client boundary for OAuth calls.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/hooks/domain/auth/useAdminAuthQuery.ts — Query hook conventions to mirror for account auth state.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/hooks/domain/auth/useAdminLoginMutation.ts — Mutation conventions to mirror for OAuth entry mutation.
- /Users/baronparedes/Documents/projects/wc-event-registration/src/config/constants/routes.ts — Canonical route constants to extend for callback/account paths.
- /Users/baronparedes/Documents/projects/wc-event-registration/supabase/config.toml — Redirect and provider-related auth configuration surface.

**Verification**

1. Manual QA only (per current validation target):
1. Invited Member can sign in via Google and lands in Member account area.
1. Invited SLOD can sign in via Google and lands in SLOD account area with restricted visibility.
1. Uninvited Google account is denied and cannot access account routes.
1. Revoked/expired invite is denied after callback and session is cleared.
1. Existing admin email/password login still works and admin protected routes remain enforced.
1. Refresh and deep-link to protected account route preserves expected post-auth destination behavior.

**Decisions**

- Included scope: end-to-end invite-only Google OAuth for Member/SLOD.
- Excluded scope: admin Google migration; admin email/password remains unchanged.
- Security rule: authentication success alone is insufficient; invite authorization is mandatory.
- Terminology note: SLOD remains provisional until glossary canonicalization, but retained for MVP-3 compatibility.

**Further Considerations**

1. Callback path choice: single shared callback route vs role-specific callback route. Recommendation: single callback route with post-resolution role routing for simpler provider config.
2. Invite transition policy: whether accepted invites can later be revoked for immediate lockout. Recommendation: yes, enforce revocation at every guarded entry check.
3. Role drift policy: handling when invite role changes after acceptance. Recommendation: enforce latest persisted role at guard evaluation, not cached client role.
