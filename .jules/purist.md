## 2026-09-30 - [Strict Type Alignment with Zod Inference]

**Deviation:** Found explicit `as any` and `eslint-disable-next-line @typescript-eslint/no-explicit-any` workarounds in form field validation components (`FormFieldEditPanel.tsx`, `FormFieldOptionsSection.tsx`) because the `FormFieldFormValues` type was manually written and diverged from the `z.infer<typeof formFieldFormSchema>`.
**Learning:** `z.string().optional().default('')` resolves to `string | undefined` in Zod infer, causing type misalignment.
**Standard:** Use `z.infer` to strictly derive Form types from the schema instead of manually typing. Use `.catch(default_value)` instead of `.default(default_value)` in schemas to enforce stricter required types without optional boundaries when it does not need to be optional in the form state. Then use `FieldErrors<T>` instead of raw `Record<string, unknown>` and `any` assertions to manage field errors correctly.

## 2026-10-01 - [Interactive Elements Semantics]

**Deviation:** Interactive elements (e.g., Edit Attendance ActionButtons wrappers) were built using `<div>` tags with `onClick` handlers.
**Learning:** This structural drift usually occurs when developers want to wrap elements to intercept events (like using `e.stopPropagation()`) without altering styling, and lazily use a `<div>`.
**Standard:** Always favor semantic interactive elements (`<button type="button">`, `<a>`) or attach the handler directly to the intended interactive component. For wrappers, move the `stopPropagation` logic into the inner button's `onClick` prop.

## 2025-02-05 - Purist: Align useForm with Style Guide

**Deviation:** `useForm` initialization in `_event-form` used a `useEffect` block with `reset()` to sync asynchronously loaded React Query data.
**Learning:** React Hook Form's newer versions support natively reacting to external asynchronous data changes via the `values` prop, entirely replacing the imperative `useEffect` pattern.
**Standard:** Compute the initial default structure during render (with `useMemo` if computationally heavy or requiring transformations) and feed it directly into the `values` prop of `useForm()`, avoiding state duplication and synchronization bugs.

## 2024-10-24 - Do not duplicate prop data to local UI state

**Deviation:** Modal component duplicated prop conditionally passed into it into an internal `useState` that toggled the modal visibility to be updated with an `useEffect`.
**Learning:** React state variables derived purely from props create a source of truth duplication. `useEffect` used to sync props to states creates lag.
**Standard:** Conditionally render components entirely without `useState` variables if it can be directly deduced from their props. In the specific scenario, render null to hide early if prop missing, then if prop exists pass `isOpen={true}` prop downward to child generic modal element.

## 2025-02-09 - Removed Form Sync via useEffect in AdminEventAttendancePageState

**Deviation:** State dependencies (`timeslot_enabled`, `enforce_check_in_event_window`, `timeslots`) were being manually reset via `useEffect` whenever their parent toggle (`attendance_enabled`, `timeslot_enabled`) was disabled.
**Learning:** This is an anti-pattern (derived state via `useEffect`) and can cause hidden bugs if fields are secretly kept around.
**Standard:** Removed `useEffect` entirely. Instead, the backend payload generation naturally zeroes out these fields during the `submitAttendanceSettings` handler if the parent toggles are false.

## 2025-02-12 - Purist: Align useForm with Style Guide in AdminMemberDetailPage

**Deviation:** `useForm` initialization in `src/pages/admin/members/[id]/index.tsx` used a `useEffect` block with `reset()` to sync asynchronously loaded React Query data.
**Learning:** React Hook Form's newer versions support natively reacting to external asynchronous data changes via the `values` prop, entirely replacing the imperative `useEffect` pattern.
**Standard:** Pass the computed async data directly into the `values` prop of `useForm()` instead of using `useEffect` with `reset()`.
