# Technical Debt and Codebase Optimization Report

## Overview

This document outlines technical debt and antipatterns found within the `wc-event-registration` codebase. It also acts as an active refactoring roadmap for tracking and addressing these issues systematically.

**Last Audit:** October 6, 2026

### Status Legend

- ✅ **Completed**: Successfully refactored and verified in the codebase.
- ⏳ **In Progress / Partial**: Partially addressed; specific remaining sub-tasks identified.
- 📋 **Open / Pending**: Open technical debt item awaiting refactoring.
- 🚫 **Moot / Superseded**: No longer applicable due to architectural or requirement changes.

---

## Antipatterns Identified & Analysis

### 1. Large Components, Hooks, and Test Files

**Status:** 📋 **Open / Pending**

Several files remain excessively large (upwards of 500–1,800+ lines), making them difficult to maintain, test, and read.

- **Files of concern (Current Line Counts as of Oct 2026):**
  - `src/pages/admin/events/[id]/public-registrations/[registration_id]/__tests__/AdminPublicRegistrationDetailPage.test.tsx` (1,854 lines) — _Large monolithic test file_
  - `src/pages/admin/events/[id]/attendance/fields/components/__tests__/AttendanceFieldEditPanel.test.tsx` (1,290 lines) — _Large form test file_
  - `src/pages/events/[slug]/register/__tests__/useEventRegistrationPageState.test.ts` (946 lines) — _Large hook test file_
  - `src/pages/admin/events/[id]/attendance/data/bulk-upload/components/__tests__/BulkUploadPanel.test.tsx` (923 lines) — _Large component test file_
  - `src/pages/events/[slug]/register/hooks/useEventRegistrationPageState.ts` (772 lines) — _Complex orchestration hook_
  - `src/pages/admin/events/[id]/attendance/fields/components/AttendanceFieldEditPanel.tsx` (563 lines) — _Monolithic edit panel_
- **Remaining Action Items:**
  - Decompose `AttendanceFieldEditPanel.tsx` by adopting shared validation components (e.g., `DynamicFieldValidationRulesSection`) similar to `FormFieldEditPanel.tsx` (335 lines).
  - Extract sub-hooks from `useEventRegistrationPageState.ts` (e.g., auto-lookup logic, registration submission, step transitions).
  - Split massive test files by `describe` blocks and scenarios (e.g., form validation, error states, happy paths).

---

### 2. Missing Error Boundaries

**Status:** ✅ **Completed**

Global and route-level error boundaries have been implemented across the application:

- **Resolved:**
  - Global `ErrorBoundary` created in `src/components/ErrorBoundary.tsx` and wrapped around the root application tree in `src/App.tsx`.
  - Route-level `RouteErrorBoundary` created in `src/components/RouteErrorBoundary.tsx` and configured across all router branches in `src/app/router.tsx`.
  - Comprehensive unit test coverage added in `src/components/__tests__/ErrorBoundary.test.tsx` and `src/components/__tests__/RouteErrorBoundary.test.tsx`.

---

### 3. Improper TypeScript Types and Casting

**Status:** ✅ **Completed**

All unsafe type assertions (`as any`, `: any`) and `@typescript-eslint/no-explicit-any` overrides have been completely eliminated across the entire application and test suites.

- **Resolved:**
  - `src/hooks/domain/forms/queries/useFormSubmissionsQuery.ts`: Unsafe `as unknown as FormSubmission[]` removed; now delegates strictly to typed API function `fetchFormSubmissions`.
  - `FormFieldEditPanel.tsx`, `EventFieldEditPanel.tsx`, and `AttendanceFieldEditPanel.tsx` refactored to use strongly typed Zod schemas, alignment with React Hook Form, and elimination of `as any` casting on resolvers and submit handlers.
  - `VisibilityRuleSection.tsx` refactored with generic `TFieldValues extends FieldValues` and `Path<TFieldValues>`.
  - Replaced all loose `: any` and `any[]` declarations in `src/__tests__/integration.test.ts` and `src/__tests__/test-utils.ts` with explicit `TestEventRecord` and `SubmitRegistrationResult` models.
  - 0 instances of `@typescript-eslint/no-explicit-any` ESLint overrides remaining in the codebase.

---

### 4. Direct DOM Manipulation

**Status:** ✅ **Completed**

Direct DOM element queries have been eliminated in favor of React Refs and standard container scrolling.

- **Resolved:**
  - `src/pages/events/[slug]/register/hooks/useEventRegistrationPageState.ts`: Replaced `document.getElementById('app-shell-title-anchor')` lookups in `onFadeStart` and `scrollToTitleAnchor` with `titleAnchorRef` (with fallback to `window.scrollTo`).
  - `src/pages/events/[slug]/register/index.tsx`: Attached `titleAnchorRef` to the root `<section>` container.
  - Test suites updated to verify ref-based scrolling without artificial DOM mutations.

---

### 5. Improper `useEffect` Dependencies

**Status:** ✅ **Completed**

All utility hooks and component effects have been audited and aligned with `eslint-plugin-react-hooks` (`exhaustive-deps`).

- **Resolved:**
  - `useWizardStepScroll`, `useStepCountdown`, and `useErrorAutoDismiss` utilize clean dependency arrays, proper timer cleanup on unmount, and `useCallback`/`useRef` for stable closures.
  - Strict CI lint gate enforces exhaustive dependencies on all effect hooks.

---

### 6. Domain Hook Layer Abstraction

**Status:** ✅ **Completed**

Architecture rules for data access and domain separation have been fully established and enforced:

- **Resolved:**
  - Supabase database operations (`.from`, `.rpc`) have been extracted to `src/lib/domain/<feature>/api.ts` (repository pattern) and re-exported from feature barrels.
  - Domain hooks in `src/hooks/domain/` call API functions cleanly without importing `supabase` directly.
  - Realtime subscription hooks (`useAttendanceCheckInRealtime`, `useAttendanceSlotRecordRealtime`) reside in `src/hooks/domain/attendance/state/` with well-defined lifecycle listeners.
  - Edge function invocations use `createEdgeFunctionCaller` from `@/lib/infrastructure`.

---

### 7. Database N+1 Queries (Supabase Edge Functions)

**Status:** ⏳ **In Progress / Partial**

Batching and RPC optimizations have been implemented for high-throughput bulk operations, while chat tool and sequential workflow optimizations remain open. Detailed analysis is tracked in `docs/analysis/n-plus-one-analysis.md`.

- **Resolved:**
  - `bulk-upsert-registrations`: Batched via chunking and atomic `apply_bulk_registration_upsert` RPC.
  - `bulk-upsert-attendance-answers`: Batched via chunking and atomic `apply_bulk_attendance_answer_upsert` RPC.
- **Remaining Action Items:**
  - `supabase/functions/chat/tools/getEvents.ts`: Currently executes `Promise.all` inside `.map()` calling `get_event_registration_count` and `get_public_event_registration_count` for each event (up to 25 items). Needs consolidation into a single batch query or multi-event count RPC.
  - Sequential transactional Edge Functions (`submit-registration`, `submit-public-registration`, `submit-registration-v2`, `check-in-attendee`) can be further consolidated into atomic Postgres stored procedures / RPCs.

---

## Multi-Phase Refactoring Roadmap

| Phase                                              | Task                                    |     Status     | Target Area                                                        |
| :------------------------------------------------- | :-------------------------------------- | :------------: | :----------------------------------------------------------------- |
| **Phase 1: Critical Fixes & Type Safety**          | Implement Error Boundaries              |  ✅ Completed  | Root router & Layout error boundaries                              |
|                                                    | Remove `as any` Casting                 |  ✅ Completed  | `AttendanceFieldEditPanel.tsx`, `VisibilityRuleSection`            |
|                                                    | Fix Direct DOM Manipulation             |  ✅ Completed  | `useEventRegistrationPageState.ts` scroll ref                      |
| **Phase 2: Component & Hook Refactoring**          | Break down Large Files                  |    📋 Open     | `useEventRegistrationPageState.ts`, `AttendanceFieldEditPanel.tsx` |
|                                                    | Review `useEffect` Dependencies         |  ✅ Completed  | Audit all utility and state hooks                                  |
| **Phase 3: Architectural & Backend Optimizations** | Supabase Edge Function N+1 Optimization | ⏳ In Progress | `getEvents.ts` count RPC, transactional RPCs                       |
|                                                    | Test File Restructuring                 |    📋 Open     | Break down large monolithic test files                             |
|                                                    | Strict Domain Hooks                     |  ✅ Completed  | Repository pattern in `src/lib/domain/`                            |
