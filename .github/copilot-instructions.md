# Copilot Instructions for wc-event-registration

These instructions define coding standards for scalable, maintainable React + TypeScript code in this repository.

## Primary Goals

- Keep features easy to change without broad refactors.
- Prefer explicit contracts at boundaries (types, schemas, return shapes).
- Preserve existing product invariants and chunk boundaries.

Project invariants:

- Public registration flow is always ID-first.
- Chunk scope is strict: do not implement future chunk behavior unless requested.
- Public writes to registrations/answers are only through approved secure backend paths.

## Architecture and File Organization

- Follow feature-oriented organization under src/.
- Keep pages focused on orchestration, not heavy business logic.
- Move reusable logic into lib/ and pure helpers.
- Prefer small components with one responsibility.
- Extract complex JSX blocks into dedicated components when they exceed reasonable readability.

Component placement rule:

- Each page must live in its own folder under src/pages/... with an index.tsx entry file.
- Page-specific components should be colocated under that page folder (for example src/pages/public/event-registration/components/).
- Use src/components/ only for truly shared, cross-page components.
- Do not keep reusable component definitions inline inside page files once they are reused or exceed simple readability.

Current baseline structure (must preserve):

- Keep route pages folder-based (for example src/pages/public/home/index.tsx and src/pages/public/event-registration/index.tsx).
- Keep admin routes folder-based (for example src/pages/admin/login/index.tsx, src/pages/admin/events/index.tsx).
- For page-local UI, prefer one component per file under that page's components/ folder.
- Use a local barrel file for page-local components when it improves import clarity (for example src/pages/public/event-registration/components/index.ts).
- Keep shared primitives under src/components/ui/ and do not duplicate those primitives in page folders.
- When refactoring, migrate imports to the new structure and remove obsolete duplicate files in the same change.

Composability rule:

- Design components to be composable through explicit props and children where appropriate.
- Keep components focused and single-purpose; compose small components instead of building monoliths.
- Separate orchestration from presentation: pages coordinate data, components render UI.
- Keep shared visual primitives and field renderers reusable across flows.

Guidelines:

- Page components: route-level composition and query coordination only.
- UI components: rendering and interaction only.
- lib/: API access, schema builders, and pure transforms.
- Avoid circular imports and hidden cross-feature coupling.

## TypeScript Standards

- Use strict, explicit types at API and form boundaries.
- Avoid any. Use unknown + refinement when needed.
- Prefer discriminated unions for multi-state flows.
- Export shared types from stable modules.
- Use zod for runtime validation of external/dynamic data.

Rules:

- Validate database metadata before rendering with it.
- Keep inferred types aligned with zod schemas using z.infer where practical.
- Do not cast unsafely to bypass compiler checks.

## React Standards

- Use function components and hooks.
- Keep hooks at top level and follow hook rules.
- Prefer derived state with useMemo over duplicated mutable state.
- Keep useEffect minimal and focused on side effects only.
- Avoid effect chains that replicate computed state.

Component design:

- One component should solve one UI concern.
- Pass explicit props, avoid broad prop spreading.
- Keep component APIs stable and predictable.
- Favor composition over prop explosions; split components when prop lists become large or mixed-concern.
- Prefer controlled extension points (children, render props, slot-like props) over branching-heavy components.
- For multi-step pages, keep the page file as orchestrator and move each step/card section to its own component file.

## State Management

- Server state: React Query.
- Form state: React Hook Form.
- Validation: Zod.
- Local UI state only for transient view concerns.

React Query:

- Use stable query keys.
- Keep query functions pure and typed.
- Handle loading, empty, and error states explicitly.

Forms:

- Define schema first, then form type from schema.
- Keep default values explicit.
- Surface field-level and form-level errors clearly.

## Data and API Layer

- Keep Supabase access in lib/ modules, not inline in many components.
- Return normalized domain shapes from lib functions.
- Validate dynamic metadata from database before use.
- Fail closed for malformed metadata and provide safe user messaging.

## Supabase Standards

- Keep all Supabase queries and RPC calls in src/lib/ modules; avoid direct Supabase calls in page/component files.
- Use typed query contracts and normalized return shapes at the lib boundary.
- Validate all dynamic/JSONB payloads with Zod before rendering or processing.
- Use SECURITY DEFINER functions or RPCs for privileged/public write paths; do not introduce direct public table writes.
- Treat RLS as deny-by-default and keep policies explicit per role and action.
- Pair RLS policies with explicit grants; do not assume RLS alone provides API access.
- Never expose service role credentials in frontend code.
- Keep migrations additive and reversible where possible; avoid destructive schema changes without a rollout plan.
- Keep seeds deterministic for local QA and aligned with current chunk behavior.
- Preserve core invariants in DB and API layers (for this repo: ID-first public flow and secure write boundary).

Supabase object/module pattern (default for new or refactored objects):

- For complex domains, split lib code into a folder module under src/lib/<domain>/.
- Use focused files with clear responsibilities:
  - types.ts: exported domain and contract types
  - queries.ts: Supabase table queries and RPC calls only
  - configValidation.ts or validation.ts: metadata/JSON validation and guards
  - dynamicSchema.ts or schemas.ts: zod schema builders for runtime form/input validation
  - transforms.ts: normalization/mapping helpers
  - index.ts: public module surface (named exports only)
- Keep queries.ts side-effect free beyond database access; no UI formatting in query functions.
- Keep page-level imports stable by exposing a compatibility barrel when refactoring legacy files (for example src/lib/publicRegistration.ts re-exporting from src/lib/public-registration/).
- Prefer additive refactors: split internals first, preserve old import path, then migrate callers incrementally.
- When introducing a new Supabase object, define its types and validation contracts before writing query logic.

Readability conventions (light command/query split, not full CQRS):

- Keep read operations and write operations separate in intent and naming, even if they live in the same domain folder.
- Query naming: use fetch..., list..., get..., lookup... for read-only functions.
- Command naming: use create..., update..., upsert..., submit..., close..., archive... for write/mutation functions.
- Do not hide writes behind query-like names.
- Keep command return shapes explicit and minimal (status/result/error context), and keep query return shapes optimized for rendering.
- If a domain grows, split queries.ts and commands.ts; do not introduce full CQRS infrastructure unless complexity justifies it.
- Prefer one exported function per use case over generic "doEverything" helpers.

## Error Handling and Observability

- Never swallow errors silently.
- Convert low-level errors into user-safe messages in UI.
- Keep detailed diagnostics in logs for debugging.
- Use consistent error message tone and structure.

## Styling and UI

- Follow existing design tokens and utility patterns.
- Reuse existing classes/patterns before introducing new variants.
- Keep responsive behavior explicit for mobile and desktop.
- Ensure keyboard and screen-reader accessibility.

Accessibility:

- Inputs must have labels.
- Use semantic HTML and proper button types.
- Ensure focus states are visible.

## Performance and Scalability

- Avoid unnecessary re-renders from unstable inline objects/functions.
- Memoize expensive derived values.
- Keep large pages split into focused subcomponents.
- Use lazy loading/code splitting when route or bundle size grows.

## Testing Expectations

When adding or refactoring non-trivial behavior:

- Add or update tests for logic-heavy helpers.
- Cover critical user paths and validation behavior.
- Protect invariants with regression tests where feasible.

Minimum validation checks before finishing significant work:

- npm run build
- npm run format:check

## Code Quality and Readability

- Prefer clarity over cleverness.
- Use meaningful names for functions, variables, and types.
- Keep functions short and cohesive.
- Add brief comments only where intent is not obvious.

Avoid:

- Deeply nested conditionals in UI components.
- Large monolithic files with mixed concerns.
- Hidden side effects in helper functions.

## Change Management

For each change:

- Keep edits scoped to requested chunk.
- Preserve existing public behavior unless intentionally changed.
- Include a short verification plan in updates.
- Update handoff docs when chunk status or decisions change.

## Vertical Slice Delivery Pattern

A vertical slice is one complete, testable, user-facing feature that runs end-to-end without dependency on other incomplete slices.

Slice anatomy (all required):

- **UI layer**: page folder with orchestration + colocated components
- **Type contracts**: domain types exported from lib module
- **Validation**: Zod schemas for form/input + metadata guards
- **Data access**: query and command functions (separate intent, typed returns)
- **Database change**: migration + SECURITY DEFINER RPC or policy update
- **RLS policy**: new or updated row-level security rules paired with the feature
- **Test coverage**: happy path + key error conditions for business logic

Completeness checklist before marking slice done:

- [ ] UI compiles and passes build
- [ ] All types strict (no `any`, no unsafe casts)
- [ ] Validation covers user inputs and database payloads
- [ ] Queries and commands named and separated by intent
- [ ] Schema migration applied locally
- [ ] RPC or write path is SECURITY DEFINER or protected by RLS
- [ ] RLS policy is deny-by-default and paired with explicit grants
- [ ] Page imports are stable (use lib barrel re-exports if needed)
- [ ] Tests cover happy path and critical error flows
- [ ] No mutations to shared types; new domain types added instead

Cross-feature coupling avoidance:

- Do not mutate shared lib types mid-feature; add new types or extend via composition.
- Keep feature-specific helpers in feature lib folder; do not add them to shared lib.
- If two features need the same validation/transform, extract to shared lib only after both are complete and isolated.
- Avoid feature A depending on incomplete feature B; make dependencies explicit in ticket scope.

When to split a slice:

- If a slice spans multiple pages, consider breaking into page-specific slices with a shared lib foundation.
- If validation or query logic exceeds ~200 LOC, extract into separate lib modules and document dependencies.
- If a slice requires database schema design that others also need, isolate schema changes to a foundation slice that other slices can build on.

## Preferred Delivery Pattern for This Repo

1. Explain the intent briefly.
2. Implement with smallest safe set of edits.
3. Verify with build/format and route checks.
4. Pause at chunk boundary for review.
