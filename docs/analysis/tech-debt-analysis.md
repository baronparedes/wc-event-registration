# Technical Debt and Codebase Optimization Report

## Overview

This document outlines technical debt and antipatterns found within the `wc-event-registration` React codebase. It also acts as a refactoring roadmap for addressing these issues systematically.

## Antipatterns Identified & Suggestions

### 1. Large Components and Hooks

Several files are excessively large (some over 1,000 lines), making them difficult to maintain, test, and read.

- **Files of concern:**
  - `src/pages/admin/events/[id]/public-registrations/[registration_id]/__tests__/AdminPublicRegistrationDetailPage.test.tsx` (1846 lines)
  - `src/pages/admin/events/[id]/attendance/fields/components/__tests__/AttendanceFieldEditPanel.test.tsx` (1290 lines)
  - `src/pages/admin/events/[id]/attendance/data/bulk-upload/components/__tests__/BulkUploadPanel.test.tsx` (923 lines)
  - `src/pages/events/[slug]/register/__tests__/useEventRegistrationPageState.test.ts` (870 lines)
  - `src/pages/events/[slug]/register/hooks/useEventRegistrationPageState.ts` (732 lines)
  - `src/pages/admin/events/[id]/attendance/fields/components/AttendanceFieldEditPanel.tsx` (556 lines)
- **Optimization Suggestions:**
  - Break down large React components into smaller, more focused sub-components.
  - Extract complex local state logic into separate custom hooks (`useReducer` or context if appropriate).
  - Split large test files based on the context/`describe` blocks they test.

### 2. Missing Error Boundaries

There are no instances of `ErrorBoundary` components used within the `src/pages/` directory, meaning unexpected JavaScript errors could crash the entire React application tree rather than displaying a fallback UI.

- **Optimization Suggestions:**
  - Introduce global and route-level `ErrorBoundary` components (e.g., using `react-error-boundary`).
  - Wrap major feature sections or complex lists within their own error boundaries to gracefully degrade the UI.

### 3. Improper TypeScript Types and Casting

While the project maintains relatively strict typing, there are instances of unsafe casting and `any` types that could bypass TypeScript's safety mechanisms.

- **Issues Found:**
  - `as any` casting used in 4 places (e.g., `src/pages/admin/events/[id]/attendance/fields/components/AttendanceFieldEditPanel.tsx` inside `zodResolver`).
  - Use of `as unknown as Type` primarily within test mocks, but also occasionally in application code (`src/hooks/domain/forms/queries/useFormSubmissionsQuery.ts:66`).
  - Roughly 30 instances of `: any` definitions, mostly within integration tests.
- **Optimization Suggestions:**
  - Replace `as any` with precise typing or generics. For Zod resolvers, ensure schema output matches the form interface exactly.
  - Replace `any` types in test files with properly mocked interfaces or `Partial<Type>`.

### 4. Direct DOM Manipulation

Direct manipulation of the DOM bypasses React's virtual DOM lifecycle and should generally be avoided.

- **Issues Found:**
  - `document.getElementById('app-shell-title-anchor')?.scrollIntoView` is used within `src/pages/events/[slug]/register/hooks/useEventRegistrationPageState.ts`.
- **Optimization Suggestions:**
  - Replace `document.getElementById` with React `useRef` to capture the DOM element reference and call `.scrollIntoView()` on the ref.

### 5. Improper `useEffect` Dependencies

There are approximately 87 instances of `useEffect` hooks across the application. Many of these have complex closures or may be missing proper dependency arrays (`exhaustive-deps`), which can lead to stale closures or unnecessary re-renders.

- **Optimization Suggestions:**
  - Ensure `eslint-plugin-react-hooks` is correctly configured and enforces `exhaustive-deps`.
  - Review hooks like `useWizardStepScroll`, `useStepCountdown`, and `useErrorAutoDismiss` to ensure functions and objects referenced inside effects are wrapped in `useCallback` or `useMemo`.

### 6. Domain Hook Layer Abstraction

**Resolved:** Supabase database operations (`.from`, `.rpc`, `.functions.invoke`) now live in `src/lib/domain/<feature>/api.ts` (repository pattern), re-exported from each feature barrel. Domain hooks call these API functions and import `supabase` only for `supabase.auth` and `supabase.storage`. Existing `createEdgeFunctionCaller` usages remain as-is.

- **Remaining:**
  - `useAttendanceCheckInRealtime` and `useAttendanceSlotRecordRealtime` still call `supabase.channel` directly; no shared realtime abstraction exists yet.

### 7. Database N+1 Queries (Supabase Edge Functions)

As documented in `docs/n-plus-one-analysis.md`, several edge functions suffer from N+1 query patterns or inefficient loops:

- `getEvents.ts`, `bulk-upsert-registrations`, `bulk-upsert-attendance-answers` all run sequential queries inside `.map()` or chunks.
- **Optimization Suggestions:**
  - Consolidate queries by utilizing PostgreSQL's `IN` clause to fetch multiple rows in a single RPC payload instead of individual loops.

---

## Multi-Phase Refactoring Roadmap

### Phase 1: Critical Fixes & Type Safety

_Targeting immediate bugs, crashes, and TypeScript stability._

1. **Implement Error Boundaries**: Add standard ErrorBoundary wrappers at the root router level and within complex page layouts.
2. **Remove `as any` Casting**: Fix form validation schema typings in `AttendanceFieldEditPanel` and `FormFieldEditPanel`.
3. **Fix Direct DOM Manipulation**: Refactor `useEventRegistrationPageState.ts` to use React Refs for scrolling rather than `document.getElementById`.

### Phase 2: Component & Hook Refactoring

_Targeting maintainability and performance._

1. **Break down Large Files**:
   - Refactor `useEventRegistrationPageState.ts` (732 lines) into smaller sub-hooks (e.g., `useRegistrationForm`, `useRegistrationValidation`).
   - Refactor `AttendanceFieldEditPanel.tsx` (556 lines) into smaller form sections.
2. **Review `useEffect` Dependencies**: Perform a sweep across all custom hooks (e.g., `useWizardStepScroll`) to verify correct use of `useEffect` and `useCallback` to prevent infinite loops and stale states.

### Phase 3: Architectural & Backend Optimizations

_Targeting scaling and infrastructure._

1. **Supabase Edge Function N+1 Optimization**: Create unified RPC calls to batch queries for `getEvents.ts` and the bulk upsert functions, eliminating `.map()`-based concurrent database queries.
2. **Test File Restructuring**: Break down massive test files (like `AdminPublicRegistrationDetailPage.test.tsx`) into focused files per test domain.
3. **Strict Domain Hooks**: Refine the separation between infrastructure and domain hooks ensuring direct Supabase operations per architectural rules.
