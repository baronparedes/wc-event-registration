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
- Page-specific components should be colocated under that page folder (for example src/pages/events/[slug]/register/components/).
- Use src/components/ only for truly shared, cross-page components.
- Do not keep reusable component definitions inline inside page files once they are reused or exceed simple readability.

Current baseline structure (must preserve):

- Keep route pages folder-based and URL-aligned (for example src/pages/home/index.tsx and src/pages/events/[slug]/register/index.tsx).
- Keep admin routes folder-based and URL-aligned (for example src/pages/admin/login/index.tsx, src/pages/admin/events/index.tsx, src/pages/admin/events/new/index.tsx, src/pages/admin/events/[id]/index.tsx).
- For page-local UI, prefer one component per file under that page's components/ folder.
- Use a local barrel file for page-local components when it improves import clarity (for example src/pages/events/[slug]/register/components/index.ts).
- Keep shared primitives under src/components/ui/ and do not duplicate those primitives in page folders.
- When refactoring, migrate imports to the new structure and remove obsolete duplicate files in the same change.

URL-to-folder parity rule (mandatory):

- The src/pages directory should mirror route segments for non-root routes.
- Dynamic route segments use bracket folders (for example [id], [slug]).
- Current root route exception: / maps to src/pages/home/index.tsx.
- For create/edit admin event routes, keep dedicated route entries:
  - /admin/events/new -> src/pages/admin/events/new/index.tsx
  - /admin/events/:id -> src/pages/admin/events/[id]/index.tsx
- Shared internals for sibling route entries may live in a route-local underscore folder (for example src/pages/admin/events/\_event-form/), but route entry files must stay URL-aligned.

Composability rule:

- Design components to be composable through explicit props and children where appropriate.
- Keep components focused and single-purpose; compose small components instead of building monoliths.
- Separate orchestration from presentation: pages coordinate data, components render UI.
- For row-level actions (for example action links that open dialogs), prefer self-managed components that own trigger/open-close state internally; page files should pass only the row data needed by that action.
- Keep shared visual primitives and field renderers reusable across flows.
- For forms specifically: page files orchestrate form state and submit flow; section components compose shared UI field primitives from `src/components/ui/`.

Guidelines:

- Page components: route-level composition and query coordination only.
- UI components: rendering and interaction only.
- Action-dialog components: own local open/close UI state and trigger wiring; expose a small data-only prop API.
- lib/infrastructure/: shared technical clients and utilities.
- lib/domain/: domain contracts, schemas, validation helpers, and pure transforms.
- Avoid circular imports and hidden cross-feature coupling.

## Import Conventions

**Always use `@/` alias imports** (never relative paths like `../../..`):

- Import from src using the `@/` prefix configured in tsconfig and vite.config.
- Examples:
  - `import { useAdminEventsQuery } from '@/hooks/domain/events'`
  - `import { Button } from '@/components/ui/Button'`
  - `import { logger } from '@/lib/infrastructure'`
  - `import type { AdminEvent } from '@/lib/domain/events'`
- Benefits: Cleaner code, easier refactoring, shorter import statements.
- Avoid: deep relative paths like `import X from '../../../../hooks'`.

## Constants Architecture

Use centralized constants from `src/config/constants/` for reusable app-wide values. Prefer importing from the barrel `@/config/constants`.

Current structure:

- `routes.ts`: route paths, prefixes, and route-builder helpers.
- `queryKeys.ts`: shared React Query key factories.
- `pagination.ts`: shared page-size defaults, options, and pagination stale-time values.
- `timing.ts`: shared timing constants (for example debounce and transition delays).
- `messages.ts`: shared UI copy for repeated toasts, loading, empty, error, and status labels.
- `validation.ts`: shared regex patterns used across domains (slug, field key, date/datetime, email, phone).
- `index.ts`: constants barrel export.

Rules:

- Reuse existing constants before adding new literals in pages, hooks, or schemas.
- Keep constants grouped by concern; do not create a catch-all constants file.
- For repeated user-facing copy, add/update `messages.ts` and consume from there.
- For shared regex patterns, add/update `validation.ts` and consume from domain schemas.
- Keep schema-specific numeric constraints (for example many max-length boundaries) in domain schemas unless explicitly requested to centralize.
- Do not reintroduce `src/config/constants/api.ts`; API request details in `src/lib/infrastructure/supabase.ts` are intentionally inlined.
- If a value is feature-local and used once, keep it local instead of forcing centralization.

Decision checklist (use in order):

1. Is the value reused across multiple files/features?

- Yes: move to `src/config/constants/<concern>.ts`.
- No: keep local.

2. Is it repeated user-facing copy (toast/loading/empty/error/status)?

- Yes: use `messages.ts`.

3. Is it a shared regex used by schemas/validation?

- Yes: use `validation.ts`.

4. Is it route, navigation, or URL-construction logic?

- Yes: use `routes.ts`.

5. Is it query-key composition for React Query?

- Yes: use `queryKeys.ts`.

6. Is it pagination or timing behavior reused in UI/hooks?

- Yes: use `pagination.ts` or `timing.ts`.

7. Is it a domain-specific rule unlikely to be shared (for example field-level limits)?

- Yes: keep it in the owning domain schema/module.

## Lib Structure

- Keep shared technical infrastructure under `src/lib/infrastructure/`.
- Keep business-domain contracts and helpers under `src/lib/domain/<feature>/`.
- Current domain folders include `auth`, `admin-audit`, `events`, `event-fields`, `registrations`, and `members`.
- Prefer domain barrel imports by default (for example `@/lib/domain/events` or `@/lib/domain/event-fields`).
- Within a lib domain, keep pure Zod definitions and schema builders in `schemas.ts`, keep display/capability constants in `metadata.ts`, and keep transforms/default-mapping helpers in `transforms.ts` when those concerns are present.
- Do not recreate legacy root wrappers such as `src/lib/supabase.ts`, `src/lib/logger.ts`, `src/lib/dateFormat.ts`, or removed legacy folders such as `src/lib/admin/` and `src/lib/event-registration/`.

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

Lint-sensitive React patterns:

- Do not mirror props or derived values into local state with `useEffect` just to keep them in sync. Prefer deriving the display value directly during render, or model explicit editing/transient state separately.
- Do not call `setState` synchronously inside effects unless the effect is synchronizing with an external system and there is no render-time alternative.
- Hooks must remain unconditional and top-level. If a hook is needed for render output, declare it before any early return branches.
- When effect cleanup depends on timers, subscriptions, or mutable refs, capture the specific handle in a local variable inside the effect and clean up that local handle instead of re-reading mutable ref state in cleanup.
- If a component or hook triggers a React lint rule, prefer restructuring state flow or hook placement over suppressing the rule.

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
- Use `watch()` sparingly and only for narrow, local reactive reads
- Prefer `useWatch()` over `watch()` when subscribing to field values for rendering, conditional sections, or derived UI state; this avoids React Compiler / lint compatibility issues and makes subscriptions explicit
- Use `reset(data)` to set default values and reset dirty state (useful for edit mode)
- Pass `register()` output to shared form field primitives
- Extract `formState` once at top level, not inside effects
- Do not call `watch()` for whole-form subscriptions in render when `useWatch()` can scope the subscription to the needed field or form slice

**React Query:**

- Use stable query keys.
- Keep query functions pure and typed.
- Handle loading, empty, and error states explicitly.

**React Query Hooks Pattern:**

Hooks own their data fetching logic directly—no separate query/command layer. This eliminates wrapper boilerplate and keeps concerns colocated.

Supabase queries (direct table access):

- Hook inlines Supabase query logic directly in the `queryFn`.
- Example: `usePublicEventQuery` inlines event availability checks.
- Types imported from the relevant domain module, for example `src/lib/domain/events/` or `src/lib/domain/event-fields/`.
- No separate `queries.ts` module; logic lives in the hook.

Edge Function mutations (privileged writes):

- Hook uses `createEdgeFunctionCaller` factory from `src/lib/infrastructure/supabase.ts` to call Edge Functions.
- Factory ensures consistent HTTP headers, error handling, and type safety.
- Example query (read): `useMemberLookupQuery` calls `member-lookup` Edge Function and returns profile data directly.
- Example mutation (write): `useSubmitRegistrationMutation` calls `submit-registration` Edge Function to persist responses.
- No separate `commands.ts` module; logic and error handling live in the hook.

Hook patterns:

- Store feature hooks under `src/hooks/domain/<feature>/` and shared UI helpers under `src/hooks/utils/`.
- **Operation-scoped subfolder structure** (MANDATORY):
  - `/queries/`: All read operations. Example: `src/hooks/domain/events/queries/usePublicEventQuery.ts`
  - `/mutations/`: All write operations. Example: `src/hooks/domain/registrations/mutations/useSubmitRegistrationMutation.ts`
  - `/state/`: Local UI orchestration (form state, temporary views, step management). Example: `src/hooks/domain/members/state/useMemberLookupState.ts`
  - Shared utilities at `src/hooks/utils/`: Cross-domain UI/form state utilities (focus management, error lifecycle, dialog state). Example: `src/hooks/utils/useErrorWithFadeout.ts`

- **Naming convention** (consistent across all domains):
  - Queries: `use<Entity>Query` (e.g., `usePublicEventQuery`, `useAdminEventsQuery`, `useMemberLookupQuery`)
  - Mutations: `use<Action><Entity>Mutation` (e.g., `useSubmitRegistrationMutation`, `useCreateEventMutation`)
  - State: `use<Entity>State` (e.g., `useMemberLookupState`)
  - Utilities: `use<Concern>` (e.g., `useErrorWithFadeout`, `useRfidAutoFocus`)

- One hook per file (strict). Export exactly one hook function with clear JSDoc.

- **Barrel exports** at each operation level:
  - `src/hooks/domain/<feature>/queries/index.ts` exports all query hooks when that operation type exists
  - `src/hooks/domain/<feature>/mutations/index.ts` exports all mutation hooks when that operation type exists
  - `src/hooks/domain/<feature>/state/index.ts` exports all state hooks when that operation type exists
  - `src/hooks/domain/<feature>/index.ts` re-exports each feature's hooks
  - `src/hooks/domain/index.ts` re-exports feature domains
  - `src/hooks/utils/index.ts` exports all shared utility hooks

- **Import pattern** (use `@/` alias):
  - From feature domain: `import { useAdminEventsQuery } from '@/hooks/domain/events'` (preferred barrel import)
  - From operation subfolder: `import { useAdminEventsQuery } from '@/hooks/domain/events/queries'` (direct import for clarity)
  - Utilities: `import { useErrorWithFadeout } from '@/hooks/utils'` (from shared barrel)

- **Pages and components import hooks directly** from domain or subdomain barrels, not from lib.
- Hooks handle error toasting and validation; pages handle UI state and user feedback.

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

## Data and API Layer

**Direct Supabase queries** (in hooks for public data read):

- Inline Supabase client calls directly in hook `queryFn` for simplicity.
- Example: `usePublicEventQuery` queries events table with availability logic.
- No separate lib/queries.ts module; logic lives in the hook where it's used.

**Edge Functions** (for privileged writes and complex business logic):

- All public write paths use Edge Functions with service role credentials.
- Edge Functions live in `supabase/functions/` and handle business logic server-side.
- Hooks call Edge Functions using `createEdgeFunctionCaller` factory from `src/lib/infrastructure/supabase.ts`.
- Example: `member-lookup` Edge Function queries users table with service role and returns profile.
- Example: `submit-registration` Edge Function handles duplicate policy, idempotency, and answer persistence.
- Prevent direct public table writes; all mutations go through Edge Functions.

**No lib wrapper layers:**

- No `src/lib/<domain>/queries.ts` or `src/lib/<domain>/commands.ts` modules.
- Hooks own their data fetching logic; no intermediate abstraction layer.
- Keep type contracts, schemas, and pure transforms under `src/lib/domain/<feature>/`.
- Use domain-local files such as `types.ts`, `schemas.ts`, `metadata.ts`, `validation.ts`, and `transforms.ts` when they match the owning domain concern.

## Query Invalidation & Cache Management

- **When to invalidate**: Mutations that change data should invalidate related queries (e.g., creating an event invalidates `useAdminEventsQuery`).
- **Invalidation patterns**:
  - Use `queryClient.invalidateQueries({ queryKey: ['events'] })` for broad invalidation.
  - Use `setQueryData()` for optimistic updates when you know the result shape.
  - Example: After `useCreateEventMutation`, immediately invalidate `['events', 'admin']` to refetch list.
- **Stale time**: Default to 0 (always stale) for admin operations; 30-60s for public read-heavy flows.
- **Background refetch**: Disable for forms and edit flows to avoid interrupting user input.
- **Race condition safety**: Invalidate only after mutation succeeds (check response discriminator); never invalidate on error.

## Loading, Empty, and Error States

- **Load states**: Use `isLoading` or `isPending` from React Query to show skeleton loaders or spinners.
- **Empty states**: When `data?.length === 0`, render explicit empty message, not a blank page.
- **Error states**: Show user-safe error message; log detailed error for debugging. Use `useErrorWithFadeout` hook for transient errors.
- **Page-level pattern**: Orchestrate states at the page level; pass loading/empty/error bools to dumb components.
- **Boundary pattern**: If a component cannot render without data, show loading or error inline rather than crashing.

## Route Parameter Validation

- **Dynamic params** (`[slug]`, `[id]`) must be validated before rendering.
- **Validation approach**: Use a query hook to fetch/validate the param (e.g., `usePublicEventQuery(slug)` returns 404 in `isError`).
- **Fail fast**: If param is invalid, show error state immediately; do not render stale/wrong data.
- **Zod guard optional**: If param format is strict (e.g., UUID), validate with Zod before querying; otherwise let query handle it.

## Async Operations & Concurrency

- **Race conditions**: When multiple queries/mutations may resolve out of order, use query keys or request IDs to ensure stale responses are ignored.
- **Avoid duplicate submissions**: Disable submit button while mutation is in-flight (`isPending`).
- **Concurrent mutations**: Do not fire multiple mutations to the same resource simultaneously; use optimistic updates or queue pattern if needed.
- **Request cancellation**: Supabase cancels outstanding requests on new query key changes; verify this does not cause unexpected UI state.
- **Stale data tolerance**: For edit forms, compare reset values against server data before allowing save; do not assume client is authoritative.

## Development Workflow

- **Local Edge Functions**: Run `supabase functions serve` in terminal; Edge Functions reload on file save.
- **Testing RLS policies**: Use `supabase test db` to run SQL tests in `supabase/tests/`; policies must deny by default.
- **Inspecting local DB**: Connect with `psql` or use Supabase Studio at `localhost:54323`.
- **VSCode debugging**: Hooks run in browser; use browser DevTools for frontend debugging. Server-side: check Edge Function logs via `supabase functions serve` output.
- **Build check**: Run `npm run build` and `npm run format:check` before commits.

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

- Keep Supabase client in `src/lib/infrastructure/supabase.ts` and export it through `@/lib/infrastructure`.
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

## Testing Strategy

**Hook testing** (Vitest + React Query):

- Use `renderHook` from `@testing-library/react` with a wrapper that provides QueryClientProvider.
- Mock Supabase client with deterministic responses for happy path and error cases.
- Test queries return correct shapes; test mutations handle success + error discriminators.
- Example: `useSubmitRegistrationMutation` should test success response, conflict error, and validation error.

**Edge Function testing**:

- Use `supabase test db` and SQL tests in `supabase/tests/` for RLS policies and database invariants.
- For function logic: call Edge Function endpoint directly with test payloads; verify response shape and status.
- Test privileged operations (service role queries) separately from public operations.

**Form testing**:

- Validate Zod schemas directly in unit tests; do not rely only on component tests.
- Test dirty state transitions and validation error display in critical flows (edit form, confirmation dialogs).

## Code Quality and Accessibility

- Prefer clarity over cleverness. Use meaningful names.
- Inputs must have labels. Use semantic HTML and proper button types.
- Ensure focus states are visible. Avoid deeply nested conditionals.
- Never swallow errors silently; convert to user-safe messages in UI.

## Design System & Styling

### Color Palette (CSS Custom Properties)

All colors are defined as CSS variables in `src/index.css` and consumed via Tailwind config:

- **Primary** (`--color-primary`): `#0b5fff` (Vibrant blue) — CTAs, active states, focus indicators
- **Secondary** (`--color-secondary`): `#0f766e` (Teal) — Accents, "upcoming" status badges
- **Accent** (`--color-accent`): `#f59e0b` (Amber/Orange) — Highlights, warnings
- **Background** (`--color-background`): `#f8fafc` (Off-white) — Page background, neutral surfaces
- **Surface** (`--color-surface`): `#ffffff` (White) — Cards, modals, elevated containers
- **Text** (`--color-text`): `#0f172a` (Near-black) — Primary text
- **Muted** (`--color-muted`): `#475569` (Slate gray) — Secondary text, disabled states
- **Border** (`--color-border`): `#d7e0eb` (Light slate) — Dividers, outlines
- **Danger** (`--color-danger`): `#dc2626` (Red) — Destructive actions, errors

### Typography

Three font stacks defined in Tailwind config; use `font-heading`, `font-body`, `font-mono` classes:

- **`font-heading`** (Manrope, 500–800): Modern geometric serif for headings and badges; pairs well with slight letter-spacing
- **`font-body`** (Source Sans 3, 400–700): Clean, readable sans-serif for body copy and form labels
- **`font-mono`** (JetBrains Mono): Code, timestamps, machine-readable content in tables

### Shadows & Depth

Layered shadow scale in `tailwind.config.js` creates visual hierarchy; all shadows use color-appropriate opacity:

- **`shadow-xs`** (0 2px 4px rgba(0, 0, 0, 0.08)): Micro elevations, subtle separations
- **`shadow-sm`** (0 4px 6px rgba(0, 0, 0, 0.1)): Default card/component shadow
- **`shadow-md`** (0 10px 15px rgba(0, 0, 0, 0.1)): Hover states, elevated containers
- **`shadow-lg`** (0 15px 30px rgba(0, 0, 0, 0.12)): Focus states, secondary modals
- **`shadow-xl`** (0 20px 50px rgba(11, 95, 255, 0.15)): Primary modals, max depth (blue-tinted for brand)

**Usage**: Apply shadows to increase depth and signal interactivity. Example:

- Cards at rest: `shadow-sm`
- Cards on hover: `shadow-md transition-all`
- Form inputs on focus: `focus:shadow-lg focus:shadow-primary/20` (blue glow for brand cohesion)
- Modals: `shadow-xl` for prominence

### Animation Utilities

Four animation utilities defined in Tailwind config for smooth, modern interactions:

- **`animate-fadeIn`** (300ms ease-out): Opacity 0 → 1; used for page transitions and component entry
- **`animate-slideUp`** (400ms ease-out): TranslateY(20px) → 0 with fade; entering elements from below
- **`animate-scaleIn`** (250ms ease-out): Scale 0.95 → 1 with fade; modal/card open, icon zoom
- **`animate-pulse-soft`** (2s continuous): Gentle opacity pulse (1 → 0.8 → 1); loading states without distraction

**Usage**: Apply to enhance perceived interactivity and guide user attention. Examples:

- Page content: `animate-fadeIn` on `<Outlet />` in AppShell
- Card enter: `hover:scale-[1.02] hover:shadow-md transition-all` (lift + depth)
- Button click: `active:scale-95` (press feedback)

### UI Component Library

Shared UI primitives in `src/components/ui/` — all components use Tailwind classes and follow consistent patterns:

**Core Primitives:**

- **`Button`**: Variants (default, outline, destructive), sizes (sm, md, lg). Includes hover lift (`scale-[1.02]`, `shadow-md`) and click press (`active:scale-95`). Always use for interactive actions.
- **`Badge`**: Status tags with variants (open, upcoming, closed, error) and optional icon slots. Used for event status, admin event status, member roles.
- **`EmptyState`**: Branded "no data" placeholder with icon, title, description, optional action. Use instead of plain "no results" text.
- **Form fields** (`FormInputField`, `FormSelectField`, `FormTextareaField`): Labeled inputs with error display. Include blue shadow glow on focus (`focus:shadow-primary/20`) for brand consistency.

**Composite Components:**

- **`ListTable`** + row/cell primitives: Admin table styling with density variants. Row hover shows subtle background + shadow (`hover:bg-slate-50 hover:shadow-xs`) for interactive feedback.
- **`SectionCard`**: Wrapper with rounded-2xl, border, shadow-sm; use for grouped content sections.
- **`ConfirmDialog`**: Modal for destructive/important actions. Always confirm before delete/archive.
- **`ActionLink`** / **`ActionConfirmButton`**: Inline action links with proper semantics.

**Import pattern** (use `@/` alias):

```tsx
import { Button, Badge, EmptyState, FormInputField } from '@/components/ui'
// Or for specific needs:
import { Button } from '@/components/ui/Button'
```

### Component Usage Rules

**Buttons:**

- Always use size `md` as default; use `sm` only in compact tables or dense UIs, `lg` for primary CTAs.
- Default variant is solid primary; use `outline` for secondary actions, `destructive` for delete/cancel.
- Disabled buttons show `opacity-60` (not clickable, but visible). Set `disabled` prop rather than removing from DOM.
- Example: `<Button variant="default" size="md" onClick={handleSave}>Save</Button>`

**Badges:**

- Use for status indicators, tags, labels (never for interactive buttons).
- Variants: `open` (primary blue), `upcoming` (secondary teal), `closed` (gray), `error` (red).
- Can include icon: `<Badge variant="open" icon={<CheckCircle2 className="h-3 w-3" />}>Published</Badge>`

**EmptyState:**

- Always use when `data?.length === 0` (don't render empty list or blank space).
- Pass icon (lucide-react), title (1–2 words), description (1 sentence), optional action (e.g., CTA button).
- Example: `<EmptyState icon={<Calendar />} title="No events" description="No events found." />`

**Form fields:**

- Always pair with `<label>` via FormInputField (label is built in).
- Use `registration={register('fieldName')}` for registered fields (preferred).
- Validation errors display inline below input in red; handled by RHF.
- Apply `focus:shadow-primary/20` automatically; no need to add custom focus classes.

**ListTable:**

- Use for admin data tables; provides consistent density, hover, divider handling.
- Set density context at table level: `<ListTable density="default">` (default) or `dense` for compact view.
- Row hover automatically shows `hover:bg-slate-50 hover:shadow-xs`; don't override unless necessary.

### Tailwind Class Organization

Organize inline Tailwind classes logically in this order:

1. **Layout** (flexbox, grid, positioning): `flex items-center gap-4`
2. **Sizing**: `min-h-10 px-4 py-2`
3. **Styling** (colors, borders, radius): `rounded-md border border-border bg-primary text-white`
4. **Interactive** (hover, focus, active): `hover:bg-primary/90 focus:outline-none focus:ring-2`
5. **Responsive**: `sm:grid-cols-2 lg:grid-cols-3`
6. **Animation**: `transition-all animate-fadeIn`

**Example (Button component):**

```tsx
className={cx(
  'rounded-md font-medium leading-snug transition-all',
  'hover:shadow-md hover:scale-[1.02] active:scale-95',
  'focus:outline-none focus:ring-2 focus:ring-primary/30',
  variantClasses,
  sizeClasses,
)}
```

### Spacing & Rhythm

Consistent spacing using Tailwind scale (4px base):

- **Compact**: `px-2 py-1` (forms in dense tables)
- **Default**: `px-4 py-2.5` (form inputs, buttons)
- **Comfortable**: `p-6` (card padding)
- **Spacious**: `gap-8 space-y-10` (section spacing in pages)

Use `space-y-*` and `gap-*` for consistent rhythm:

- `space-y-2`: Small gaps (labels + help text)
- `space-y-4`: Default section gaps
- `space-y-6` or `gap-6`: Card grid gaps
- `space-y-10`: Page section separation

### Hero Asset & Brand

- Hero asset (`src/assets/hero.png`): 3D purple/blue box. Used subtly on home page as low-opacity background (`opacity-10`) to reinforce brand without distraction.
- Favicon (`public/favicon.svg`): Primary blue checkmark badge; visible in browser tabs.
- Never remove or heavily modify the hero asset; it's part of brand identity.

### Accessibility & Contrast

- **Color contrast**: Primary text on white passes WCAG AA (>4.5:1). Test custom color combinations with WebAIM.
- **Focus rings**: All interactive elements (buttons, links, inputs) show 2px primary-colored focus ring. Never remove.
- **Icon usage**: Always pair icons with text labels for clarity; never icon-only (exception: obvious symbols like X for close).
- **Motion**: Animations use reasonable timing (300–400ms); avoid distracting or excessive motion.

### When to Add New Styling

Before adding custom CSS or new Tailwind classes:

1. **Check existing utilities**: Does Tailwind already provide it? (e.g., `rounded-md`, `shadow-lg`)
2. **Use design tokens**: Does a CSS variable exist? (e.g., `text-primary` vs. inline hex)
3. **Reuse component**: Can you use an existing component (Button, Badge, EmptyState)?
4. **Consider animation**: Does it need `transition-all` or an animation utility?

If you must add custom CSS:

- Keep it in component scope (scoped to the component file, not global)
- Document why it's needed (e.g., "custom gradient for hero section")
- Do not duplicate existing Tailwind utilities
- Update this guide if adding a reusable pattern

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

- [ ] UI compiles and passes build; `npm run format:check` passes
- [ ] All types strict (no `any`, no unsafe casts)
- [ ] Validation covers user inputs and database payloads (Zod schemas)
- [ ] Hooks own their data fetching logic (no wrapper layers)
- [ ] Edge Functions are used for all privileged writes
- [ ] Schema migration applied locally; RLS policy is deny-by-default and paired with explicit grants
- [ ] Query invalidation strategy is explicit (what invalidates after this mutation?)
- [ ] Loading, empty, and error states are handled at page level
- [ ] Dynamic route params are validated before rendering
- [ ] Tests cover happy path + critical error flows
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
