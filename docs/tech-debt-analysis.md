# React Technical Debt Analysis & Multi-Level Refactoring Roadmap

## Executive Summary

This document presents a comprehensive audit of the React frontend codebase (`src/`) for the WC Event Registration Platform. The analysis evaluates the codebase against modern React 19 standards, industry best practices, and clean architecture principles.

The goal of this refactoring initiative is to reduce cognitive complexity, eliminate duplicate code, improve performance, ensure strict type safety, and enhance maintainability **without changing any application behavior or public interfaces**.

---

## Technical Debt Inventory & Categorization

### 1. Component Architecture & Code Splitting

- **Monolithic UI Components**: Components such as `SelectFieldRenderer.tsx` (575 lines) and `AttendanceFieldEditPanel.tsx` (556 lines) combine layout, dynamic form rules, modal triggers, and inline styling in single files.
- **Duplicate Infinite Scroll Boilerplate**: The `IntersectionObserver` callback logic for triggering infinite scroll pagination is duplicated across 4 separate admin view files (`admin/events/index.tsx`, `admin/members/index.tsx`, `admin/events/[id]/registrations/index.tsx`, `admin/events/[id]/public-registrations/index.tsx`).
- **Page & Component Mixed Concerns**: Certain pages directly handle state orchestration that belongs in domain custom hooks.

### 2. State Management & Anti-Patterns

- **Redundant State Syncing via `useEffect`**: `FormSelectField.tsx` uses `useEffect` to synchronize internal state with incoming `value` props, causing dual rendering cycles and potential race conditions.
- **Effect-driven Form Resets**: Dialog components (`PublishEventDialog.tsx`, `AddMemberDialog.tsx`) use `useEffect` to reset forms when the `open` prop changes instead of resetting on dialog close or leveraging controlled reset callbacks.
- **Monolithic Page State Hooks**: `useEventRegistrationPageState.ts` (732 lines) handles URL parsing, step navigation, countdowns, member lookup, RFID auto-focus, dynamic field calculation, and submission state within a single monolithic hook.

### 3. TypeScript & Type Safety

- **Type Assertions (`as ...`)**: Multiple data fetching hooks and domain utilities use `as unknown as Type` or `as string` instead of runtime schema validation or properly typed database models.
- **Duplicate Interface Definitions**: Interface definitions for event field options and registration answers are defined independently across domain files and UI components instead of sharing a single source of truth.
- **Magic Strings and Numbers**: Hardcoded timeout durations (e.g. `3000`, `5000`), default page sizes, and status strings exist inline across hooks and UI views rather than using centralized domain constants.

### 4. React Query & Server State Patterns

- **Inconsistent Query Key Management**: Some hooks generate query key arrays inline using string literals rather than using dedicated query key factories, increasing the risk of query cache key mismatches during invalidations.
- **Mutation Invalidation Granularity**: Mutation hooks occasionally invalidate broad query keys rather than pinpointing specific cache queries.

### 5. Form & Validation Patterns

- **Dual Error Tracking**: Certain custom field renderers and page forms maintain internal React state for error messages alongside React Hook Form's `formState.errors`, leading to potential discrepancies in validation UI state.

---

## Multi-Level Refactoring Roadmap

### Phase 1: Foundation & Low-Hanging Refactoring _(Current Phase)_

- **Task 1.1**: Extract reusable `useInfiniteScrollTrigger` hook to eliminate duplicate `IntersectionObserver` boilerplate across all admin list views.
- **Task 1.2**: Refactor `FormSelectField` to eliminate `useEffect` prop-to-state mirroring and ensure direct controlled behavior.
- **Task 1.3**: Refactor dialog reset triggers in `PublishEventDialog` and `AddMemberDialog` to eliminate redundant effect syncs.
- **Task 1.4**: Centralize query key factories across React Query hooks.

### Phase 2: Structural & Component Decomposition

- **Task 2.1**: Break down monolithic state hook `useEventRegistrationPageState` into smaller focused custom hooks (`useRegistrationStepNavigation`, `useRegistrationLookup`, `useRegistrationSubmission`).
- **Task 2.2**: Decompose monolithic components `SelectFieldRenderer` and `AttendanceFieldEditPanel` into focused sub-components.
- **Task 2.3**: Unify form error state management to rely strictly on React Hook Form context.

### Phase 3: Type Safety & Validation Hardening

- **Task 3.1**: Eliminate type assertions in React Query hooks by wrapping domain responses in Zod schemas.
- **Task 3.2**: Consolidate domain interface re-exports and eliminate redundant type declarations.
- **Task 3.3**: Extract inline magic numbers and timeout constants into domain configuration files.

### Phase 4: UI Performance & Accessibility (a11y)

- **Task 4.1**: Audit and enhance ARIA attributes (`aria-expanded`, `aria-label`, `aria-describedby`) on custom form elements and dialog triggers.
- **Task 4.2**: Add `React.memo` and `useCallback` optimizations for high-frequency table and list items in admin views.
