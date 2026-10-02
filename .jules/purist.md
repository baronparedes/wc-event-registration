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
