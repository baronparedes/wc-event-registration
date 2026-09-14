# AI Agent Operational Guidelines (`AGENTS.md`)

This file contains the core principles, architecture rules, and domain logic constraints for this repository. **All AI Agents MUST read and follow these instructions** before proposing or making changes.

## 1. Agent Workflow & Planning Mode

- **Deep Planning Mode**: Before making changes or creating an execution plan, you must ALWAYS enter a deep planning mode by asking clarifying questions to confirm the user's expectations and assumptions. Never assume requirements.
- **Verification**: Verify changes by running the appropriate checks. Do not guess if code compiles.
- **CI Gate**: The repository CI gate command is `npm run ci:gate`. Do NOT run this command on every small change or intermediate step, as it takes too much time. ONLY run this command when you are finalizing code and preparing for a commit to ensure formatting, linting, building, and tests pass.
- **Formatting**: If formatting fails, run `npm run format`.

## 2. Core Coding Standards & TypeScript Rules

- **Strict Typing**: Do NOT use `any` types.
- **No Linter Overrides**: Do NOT override linter rules with `@typescript-eslint/no-explicit-any` comments. Always prefer strict TypeScript typing, schema inference (e.g., Zod), and generics.
- **Tech Stack**: This project uses React 19, Vite, TypeScript, TailwindCSS, Supabase, React Query, and Zod. Ensure all solutions align with these tools.

## 3. Architecture & Code Organization

- **Domain Hooks**: Domain hooks must reside in `src/hooks/domain/`.
  - They must execute Supabase database operations _directly_ inside the individual hook files.
  - Do NOT use intermediate data abstraction files or repository patterns.
  - Each hook must be defined in its own file.
- **Pagination**: Admin paginated data views (Events, Members, Member Registrations, Public Registrations) must use the `useInfiniteScrollTrigger` custom hook (`src/hooks/utils/useInfiniteScrollTrigger.ts`). It utilizes `IntersectionObserver` for infinite scroll pagination via React Query's `useInfiniteQuery`.
- **Legal/Org Config**: Application legal and organization configuration details (app name, organization name, privacy contact email) are defined centrally in `src/config/constants/legal.ts`.
- **Tech Debt**: The React codebase technical debt audit and multi-phase refactoring roadmap are documented in `docs/tech-debt-analysis.md`. Refer to this document before embarking on large refactors.

## 4. Authentication, Roles & Security

- **Authentication Flows**:
  - Non-admin users signing in via Google OAuth maintain an active Supabase session.
  - Email/password login remains strictly for Admin authentication.
- **Authorization & Routing**:
  - Access to admin-restricted routes (`RequireAdminAuth`) automatically redirects non-admin sessions to the home page (`/`).
  - The `/profile` route displays a read-only view of member details and event history for non-admin users. This is authorized via session email matching (`lower(email) = lower(auth.jwt() ->> 'email')`) on `public.users` RLS and the `get_member_event_history` RPC.
- **Super-Admin Role Management**:
  - The user role management page is at `/admin/users/roles` and is strictly restricted to `super_admin` users.
  - It uses security-definer RPCs `get_admin_roles` and `list_auth_users` to facilitate role management for Supabase auth users across assignable roles (`admin`, `slod`, `imt`, `kiosk`).

## 5. Domain Logic: Event Registration & Hub

- **Hub Page (`src/pages/home`)**:
  - Integrates open events and published forms into mixed sections using a generic `HubSection`.
  - Visually distinguishes them with title icons (`Calendar` for events, `FileText` for forms).
  - Past events are rendered as a compact list (`PastEventList`) to conserve UI space.
- **Registration Auto-Lookup**:
  - Event registration for signed-in members automatically performs a lookup using session credentials and advances directly to Step 3.
  - A dedicated verification loading card must be displayed during auto-lookup to avoid rendering the Step 1 input form.
  - For events without dynamic fields, signed-in members must explicitly confirm registration.
  - Kiosk inactivity reset timeouts are disabled for signed-in member registrations.
- **Field Visibility Rules**: Field visibility dependency rules are stored inside `validation_rules.visibility_rule` (`depends_on_field_key`, `equals_value`) for both Event Fields and Attendance Fields.
- **Attendance Export**: Attendance CSV export filenames must follow the `event-{eventId}-{type}-{timestamp}.csv` naming convention.

## 6. Domain Logic: Forms Entity

- The Forms entity supports non-event data gathering using the `forms`, `form_fields`, `form_submissions`, and `form_submission_answers` tables.
- **Features include**:
  - Dynamic field configurations.
  - Audience access controls: `members`, `public`, `members_and_public`.
  - Duplicate policies: `block`, `allow_update`, `allow_multiple`, `allow_multiple_update`.
- Active forms are displayed directly on the main Hub page (`/`) alongside events.

## 7. Domain Logic: Service Attendance & Layouts

- Service attendance and seat layout configurations are managed as an _independent domain_ (`service_attendance`, `service_layouts`, `service_seats`), entirely separate from standard events.
- In this domain, RFID tags correspond to `users.member_id`.

## 8. Testing

- **Unit Tests**: Executed with `npm run test:unit` using Vitest.
- **Environment**: Vitest expects Supabase environment variables to be defined in `.env.local`.
- **Coverage**: Supabase Edge Functions (`supabase/functions/**`) are intentionally excluded from Vitest test coverage reporting.
