# AI Agent Operational Guidelines (`AGENTS.md`)

This file contains the core principles, architecture rules, and domain logic constraints for this repository. **All AI Agents MUST read and follow these instructions** before proposing or making changes.

## 1. Agent Workflow & Planning Mode

- **Deep Planning Mode**: Before making changes or creating an execution plan, you must ALWAYS enter a deep planning mode by asking clarifying questions to confirm the user's expectations and assumptions. Never assume requirements.
- **Verification & Fast Pre-Commit**: Validate changes using `npm run precommit`. This fast check validates formatting, linting, TypeScript types, related Vitest tests, and Deno Edge Function tests for all staged, unstaged, and untracked changed files in ~2-6s.
- **CI Gate**: `npm run ci:gate` runs the full repository test suite and coverage reports for CI pipeline validation. Agents must use `npm run precommit` (or targeted test commands) for validating work instead of running the full `ci:gate`.
- **Formatting**: If formatting fails, run `npm run format`.

## 2. Core Coding Standards & TypeScript Rules

- **Strict Typing**: Do NOT use `any` types.
- **No Linter Overrides**: Do NOT override linter rules with `@typescript-eslint/no-explicit-any` comments. Always prefer strict TypeScript typing, schema inference (e.g., Zod), and generics.
- **Tech Stack**: This project uses React 19, Vite, TypeScript, TailwindCSS, Supabase, React Query, and Zod. Ensure all solutions align with these tools.

## 3. Architecture & Code Organization

- **Domain Hooks**: Domain hooks must reside in `src/hooks/domain/`.
  - Supabase database operations (`.from`, `.rpc`) and Edge Function calls must live in `src/lib/domain/<feature>/api.ts` as explicitly named, strongly typed functions re-exported from the feature barrel; hooks call these functions.
  - Edge Function calls MUST use `createEdgeFunctionCaller` from `@/lib/infrastructure` rather than calling `supabase.functions.invoke` directly.
  - Hook files must not import `supabase`, except for `supabase.auth` and `supabase.storage` operations.
  - Do NOT create data abstraction files inside `src/hooks/`.
  - Each hook must be defined in its own file.
- **Pagination**: Admin paginated data views (Events, Members, Member Registrations, Public Registrations) must use the `useInfiniteScrollTrigger` custom hook (`src/hooks/utils/useInfiniteScrollTrigger.ts`). It utilizes `IntersectionObserver` for infinite scroll pagination via React Query's `useInfiniteQuery`.
- **Legal/Org Config**: Application legal and organization configuration details (app name, organization name, privacy contact email) are defined centrally in `src/config/constants/legal.ts`.
- **Tech Debt**: The React codebase technical debt audit and multi-phase refactoring roadmap are documented in `docs/analysis/tech-debt-analysis.md`. Refer to this document before embarking on large refactors.

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
- **Attendee Details & Contact Number**:
  - The Attendee Details modal (`AttendeeDetailsModal`) and Manage Attendee Details page query attendees via `list_event_attendees_v2`, returning `phone` for both registered members and public registrants.
  - Displays as `Contact Number: {phone}` in the modal header and is available as a selectable/searchable dynamic member field (`member:phone`).
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
- Service commitments are snapshotted in `public.user_commitment_history` via the `users_snapshot_commitment_metadata` trigger on `public.users`. The trigger function `snapshot_user_commitment_metadata` is declared `SECURITY DEFINER` with `search_path = public`, and only snapshots when Sunday commitment keys (`first_sunday` through `fifth_sunday`) change. Snapshots are effective-dated to the nearest upcoming Sunday (`get_nearest_upcoming_sunday`).
- The profile service attendance history UI (`ServiceAttendanceHistoryTab`) queries snapshots to evaluate historical schedule alignment per Sunday using `resolveMetadataForDate`.

## 8. Domain Logic: App Notifications & Multi-Channel Broadcasting

- **Notification Center & Header Drawer**:
  - The notification bell in the main app header renders unread alert badges, supports real-time listening via Supabase Realtime on `app_notification_recipients`, and offers a slide-over drawer with filtering (`All` and `Unread`), tab switching, mark-as-read, and deletion.
- **Admin Broadcasting (`/admin/notifications`)**:
  - Restricted to administrators (`admin`, `super_admin`).
  - **Multi-Channel Delivery**: Administrators can toggle **Push** and **Email** channels simultaneously (or individually) for any broadcast.
  - **Target Audiences**:
    - `all`: Broadcasts to all registered members.
    - `role`: Multi-role selection across Auth Roles (`super_admin`, `admin`, `slod`, `imt`, `kiosk`) and Member/Volunteer Roles (`Prayer Coach`, `Backroom Support`, `IMT Support`, `VMT Support`, `OIC`, `Usher`).
    - `user`: Mention-style autocomplete user search (`BroadcastUserPicker`) with debounced querying.
    - `event`: Searchable event dropdown (`BroadcastEventPicker`) automatically targeting registered members and public registrants of the selected event.
  - **Live Audience Reach Validation**: Queries `get_broadcast_audience_stats` to display real-time reachable member/public counts, email reach, and push subscription counts before dispatching.
  - **Mandatory Confirmation Gate (`BroadcastConfirmDialog`)**: Displays channels, rich recipient profiles, role/event pills, warning notices, and message payload previews.
- **Edge Functions & Multi-Channel Delivery**:
  - **`send-app-notification`**: Modularized with dedicated services (`pushService.ts`, `emailService.ts`) and target resolvers in `targets/` (`eventTarget.ts`, `roleTarget.ts`, `allTarget.ts`, `userTarget.ts`).
  - **`cron-process-email-queue`**: Consumes `email_queue` messages and dispatches via Resend API (`/emails`).
  - **Local Broadcast Safety Harness (`_shared/localBroadcast.ts`)**: When running in local development (`LOCAL_BROADCAST=true` or non-production environment without Resend API keys), all push and email broadcasts are safely appended to `./local-broadcasts.log` instead of reaching external devices or real email addresses. Output files are gitignored.

## 9. Testing

- **Unit Tests (React/Frontend)**: Executed with `npm run test:unit` using Vitest.
- **Unit Tests (Edge Functions)**: Executed with Deno test runner (`npm run test:edge` or `npm run precommit`). Tests reside in `supabase/functions/<name>/__tests__/`. AI Agents modifying or adding Edge Functions MUST always author or update corresponding Deno unit tests.
- **Environment**: Vitest expects Supabase environment variables to be defined in `.env.local`.
- **Coverage**: Supabase Edge Functions (`supabase/functions/**`) are intentionally excluded from Vitest test coverage reporting as they are tested via Deno.

## 10. Repository Skills & Specialized Guides (`.agent/skills/`)

The repository maintains specialized skills in [`.agent/skills/`](.agent/skills/). AI Agents MUST check and follow these skills when working in their respective domains:

- **React Architecture & Standards**:
  - [`react-best-practices`](.agent/skills/react-best-practices/skill.md): Component decomposition, hook design rules, state colocation, performance, accessibility, and avoiding anti-patterns. Consult when creating, reviewing, or refactoring React components.
  - [`react-ui-patterns`](.agent/skills/react-ui-patterns/skill.md): Repository UI design system patterns, component composition, and layout conventions.
- **TypeScript & Planning**:
  - [`typescript-standards`](.agent/skills/typescript-standards/skill.md): Strict typing, Zod schema inference, generic patterns, and zero-linter-override policies.
  - [`deep-planning`](.agent/skills/deep-planning/skill.md): Structured planning requirements, clarifying questions, and risk verification.
- **Backend, Queries & Edge Functions**:
  - [`domain-hooks`](.agent/skills/domain-hooks/skill.md): Rules for authoring TanStack React Query hooks and direct Supabase client queries in `src/hooks/domain/`.
  - [`domain-logic`](.agent/skills/domain-logic/skill.md): Entity business rules, Hub sectioning, Sunday commitment triggers, service attendance domain boundaries, and attendee details phone support.
  - [`edge-functions`](.agent/skills/edge-functions/skill.md): Supabase Edge Function standards, Deno runtime conventions, security-definer patterns, and CORS configurations.
  - [`edge-function-testing`](.agent/skills/edge-function-testing/SKILL.md): Incremental Deno unit, handler, and local-Supabase integration testing for Supabase Edge Functions.
  - [`chat-tools`](.agent/skills/chat-tools/SKILL.md): Guidelines for authoring chat tools in `supabase/functions/chat/tools/`, standardized timeframe schemas, and tool parameter validation.
  - [`background-jobs`](.agent/skills/background-jobs/skill.md): Asynchronous database job queues, email queues, retry patterns, and worker logic.
  - [`database-migrations`](.agent/skills/database-migrations/SKILL.md): Supabase SQL migration authoring rules, timestamp naming conventions, single responsibility decomposition, idempotent DDL/RLS patterns, and RPC signature preservation.
- **Data Transformation, Formatting & Testing**:
  - [`csv-timezone`](.agent/skills/csv-timezone/skill.md): CSV parsing/export conventions and timezone conversions (UTC vs Asia/Manila).
  - [`attendance-json-filter-translator`](.agent/skills/attendance-json-filter-translator/skill.md): Translating plain-language filter criteria into structured JSON query filter trees.
  - [`testing-vitest`](.agent/skills/testing-vitest/skill.md): Vitest mocking patterns, factory utilities, and React Testing Library standards.
