# wc-event-registration

- Preserve existing behavior.
- No future-scope features.
- ID-first registration flow.
- Public writes via Edge Functions only.

## Structure

- Pages=orchestration
- Components=UI
- Hooks=data/state
- Domain=`lib/domain`
- Infra=`lib/infrastructure`
- Shared UI=`components/ui`
- Route folders match URLs
- Use `@/` imports only

## Standards

- Strict TS, no `any`
- Zod for external data
- RHF+Zod for all forms
- React Query for server state
- Minimize `useEffect`
- Prefer derived state

## Data

- Reads: React Query + Supabase
- Writes: Edge Functions only
- Validate route params before render
- Invalidate affected queries after mutations

## Hooks

- `queries/`, `mutations/`, `state/`
- One hook per file
- `useXQuery`
- `useActionXMutation`
- `useXState`

## Edge Functions

- `index.ts` = orchestration only
- Logic in `handlers/*`
- Register in `config.toml`

## Agent Mode

- Read first
- Minimal edits
- No commands unless requested
- Use `build:agent` / `test:agent`
- Never run `ci:gate`

## Missing Context

Ask only:

- Objective
- Scope
- Constraints
- Validation

## Response

Intent → Changes → Verification
