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

HIGH PRIORITY (MANDATORY FOR ALL FUTURE PROMPTS):

- Treat shared component placement as a MUST, not a suggestion.
- Primary objective: keep styling changes centralized so visual updates can be made in one place.
- If a UI pattern is reusable across sections/pages (for example labeled input fields, slug fields, common field renderers), it MUST live in `src/components/ui/`.
- Page folders (`src/pages/.../components/`) are for page-specific composition only; do not keep reusable primitives there.
- Before adding a new page-local primitive, check `src/components/ui/` first and reuse/extend existing components when possible.
- If a reusable primitive is discovered in a page folder during implementation, move it to `src/components/ui/` in the same change and update imports.
- Future generated code should default to composing with shared UI primitives first, then page-local wrappers second.
- For common controls (buttons, inputs, textareas, selects, badges, cards), create or extend a shared primitive in `src/components/ui/` before introducing per-page utility class duplication.
- Avoid repeating large utility `className` strings for common controls in page files; extract those styles into shared UI primitives.

Composability rule:

- Design components to be composable through explicit props and children where appropriate.
- Keep components focused and single-purpose; compose small components instead of building monoliths.
- Separate orchestration from presentation: pages coordinate data, components render UI.
- Keep shared visual primitives and field renderers reusable across flows.
- For forms specifically: page files orchestrate form state and submit flow; section components compose shared UI field primitives from `src/components/ui/`.

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

- **Form state: React Hook Form (mandatory for all forms)**
- Server state: React Query.
- Validation: Zod.
- Local UI state only for transient view concerns.

**React Hook Form is the single source of truth for form state:**

- All forms must use React Hook Form with Zod schema validation
- Do not use useState for form field values; use RHF's `register()` and `watch()`
- Extract `isDirty`, `dirtyFields`, `errors`, `isValid` from `formState` as needed
- Never duplicate form state management logic; RHF handles it all

**React Hook Form patterns:**

- Use `zodResolver(schema)` to integrate Zod validation
- Use `watch()` only when you need reactive updates (conditionals, dependent fields)
- Use `reset(data)` to set default values and reset dirty state (useful for edit mode)
- Pass `register()` output to shared form field primitives
- Extract `formState` once at top level, not inside effects

**Why RHF:**

- Minimal re-renders: only watches needed fields
- Built-in dirty tracking via `isDirty` and `dirtyFields`
- Perfect TypeScript integration with Zod schemas
- No need for manual validation or state duplication
- Clean change detection for confirmation dialogs and unsaved warnings

**React Query:**

- Use stable query keys.
- Keep query functions pure and typed.
- Handle loading, empty, and error states explicitly.

**React Query Hooks Pattern:**

Hooks own their data fetching logic directly—no separate query/command layer. This eliminates wrapper boilerplate and keeps concerns colocated.

Supabase queries (direct table access):

- Hook inlines Supabase query logic directly in the `queryFn`.
- Example: `usePublicEventQuery` inlines event availability checks.
- Types imported from `src/lib/event-registration/types.ts`.
- No separate `queries.ts` module; logic lives in the hook.

Edge Function mutations (privileged writes):

- Hook uses `createEdgeFunctionCaller` factory from `src/lib/supabase.ts` to call Edge Functions.
- Factory ensures consistent HTTP headers, error handling, and type safety.
- Example: `useMemberLookupMutation` calls `member-lookup` Edge Function directly.
- Example: `useSubmitRegistrationMutation` calls `submit-registration` Edge Function directly.
- No separate `commands.ts` module; logic and error handling live in the hook.

Hook patterns:

- Store hooks in `src/hooks/<domain>/` folder, one file per hook (e.g., `src/hooks/event-registration/`).
- Naming convention:
  - Queries: `use<DomainEntity>Query` (e.g., `usePublicEventQuery`)
  - Mutations: `use<Action><DomainEntity>Mutation` (e.g., `useMemberLookupMutation`, `useSubmitRegistrationMutation`)
- Each hook file exports exactly one hook function with clear JSDoc.
- Create `src/hooks/<domain>/index.ts` barrel export for all hooks in the domain.
- **Pages and components import hooks directly**, not from lib barrels.
- Hooks handle error toasting and validation; pages handle UI state and user feedback.

Benefits:

- Single source of truth for query keys and retry logic
- Consistent error handling (toasts built into mutations, explicit in components)
- Cacheable and mockable for testing
- Easier to refactor: business logic lives where it's used
- No unnecessary abstraction layers

Forms:

**React Hook Form (RHF) is mandatory for all forms:**

- Define Zod schema first, then infer form type: `type MyForm = z.infer<typeof mySchema>`
- Use `useForm` with `zodResolver` for validation integration
- Extract `formState` properties as needed: `errors`, `isDirty`, `dirtyFields`, `isValid`
- Pass Zod schema directly to resolver; let RHF handle validation lifecycle

**Form field props and composition:**

- Keep default values explicit in `useForm({ defaultValues: {...} })`
- Surface field-level errors and form-level errors clearly via UI primitives
- Pass field registration from RHF to shared form field primitives (FormInputField, FormTextareaField, FormSelectField, etc.)
- Shared primitives handle label + input + error display in one place; page files compose these primitives

**Change detection and dirty state:**

- Use `isDirty` from `formState` to detect if any field has changed from defaults
- Use `dirtyFields` object to identify which specific fields changed (e.g., for confirmation dialogs)
- Compare against reset values for edit mode: reset form with existing data, then `isDirty` tracks mutations
- Disable save button when edit mode and `!isDirty` to prevent unnecessary saves
- Never duplicate change detection logic; rely on RHF's `dirtyFields` as single source of truth

**Field registration modes:**

- Registered fields: pass `registration={register('fieldName')}` to shared primitives
- Controlled fields: use `value={watch('fieldName')}` + `onChange` for dynamic field behavior
- Prefer registered mode for simple fields; use controlled only when you need `watch()` for conditional rendering

**Validation and error display:**

- Zod schema defines all validation logic; do not add separate validation in component
- Keep validation errors from `formState.errors` explicit in field-level error text
- For cross-field validation (date ranges, interdependent fields), use `superRefine` in Zod schema
- Surface errors immediately on field blur or after form submission attempt (handled by RHF)

**Benefits of this approach:**

- Single source of truth for form state via RHF
- Validation logic colocated in Zod schema (not spread across component)
- Change detection is automatic and reliable
- Easier to add features (confirmation dialogs, unsaved changes warnings, etc.)
- No manual state duplication or "dirty checking" code

## Data and API Layer

**Direct Supabase queries** (in hooks for public data read):

- Inline Supabase client calls directly in hook `queryFn` for simplicity.
- Example: `usePublicEventQuery` queries events table with availability logic.
- No separate lib/queries.ts module; logic lives in the hook where it's used.

**Edge Functions** (for privileged writes and complex business logic):

- All public write paths use Edge Functions with service role credentials.
- Edge Functions live in `supabase/functions/` and handle business logic server-side.
- Hooks call Edge Functions using `createEdgeFunctionCaller` factory from `src/lib/supabase.ts`.
- Example: `member-lookup` Edge Function queries users table with service role and returns profile.
- Example: `submit-registration` Edge Function handles duplicate policy, idempotency, and answer persistence.
- Prevent direct public table writes; all mutations go through Edge Functions.

**No lib wrapper layers:**

- No `src/lib/<domain>/queries.ts` or `src/lib/<domain>/commands.ts` modules.
- Hooks own their data fetching logic; no intermediate abstraction layer.
- Keep type contracts in `src/lib/<domain>/types.ts` for shared domain types.
- Validation logic in `src/lib/<domain>/configValidation.ts` or `dynamicSchema.ts` as needed.

**Type safety at boundaries:**

- Validate database metadata before rendering with it.
- Use Zod for runtime validation of Edge Function responses and form inputs.
- Keep inferred types aligned with validation schemas using `z.infer` where practical.

## Supabase & Edge Functions Standards

**Edge Functions as write path:**

- All privileged/public write operations use Edge Functions, not direct RPC or table writes.
- Edge Functions live in `supabase/functions/` with TypeScript files.
- Edge Functions query Postgres directly with service role credentials.
- RLS still enforced at table level for defense-in-depth.
- No service role credentials exposed in frontend code.

**Supabase client usage:**

- Keep Supabase client in `src/lib/supabase.ts` and export for hooks to use.
- Export Edge Function caller factory `createEdgeFunctionCaller` from the same module.
- Hooks call Supabase directly or via Edge Function factory as needed.
- No intermediate query/command modules; logic lives in hooks.

**RLS and grants:**

- Treat RLS as deny-by-default; keep policies explicit per role and action.
- Pair RLS policies with explicit grants; do not assume RLS alone provides API access.
- Grant anon/authenticated roles only needed table privileges (e.g., select on public events).
- Grant service_role all necessary privileges for Edge Functions.

**Migrations and seeds:**

- Keep migrations additive and reversible where possible.
- Avoid destructive schema changes without a rollout plan.
- Keep seeds deterministic for local QA and aligned with current behavior.
- Preserve core invariants in DB and API layers (for this repo: ID-first public flow and secure write boundary).

**Validation at boundaries:**

- Validate all dynamic/JSONB payloads with Zod before rendering or processing.
- Return typed response shapes from Edge Functions with `success` discriminator.
- Handle Edge Function errors explicitly in hooks with user-safe toast messages.

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
- **Data access**: hooks for queries and mutations (queries inline Supabase, mutations use Edge Functions)
- **Edge Functions** (if needed): `supabase/functions/` with business logic and service-role DB access
- **Database change**: migration + RLS policy update or new Edge Function
- **RLS policy**: new or updated row-level security rules paired with the feature
- **Test coverage**: happy path + key error conditions for business logic

Completeness checklist before marking slice done:

- [ ] UI compiles and passes build
- [ ] All types strict (no `any`, no unsafe casts)
- [ ] Validation covers user inputs and database payloads
- [ ] Hooks own their data fetching logic (no wrapper layers)
- [ ] Edge Functions are used for all privileged writes
- [ ] Schema migration applied locally
- [ ] Edge Function (if used) queries Postgres directly with service role
- [ ] RLS policy is deny-by-default and paired with explicit grants
- [ ] Page imports are stable
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
