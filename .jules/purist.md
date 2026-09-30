## 2026-09-30 - [Strict Type Alignment with Zod Inference]

**Deviation:** Found explicit `as any` and `eslint-disable-next-line @typescript-eslint/no-explicit-any` workarounds in form field validation components (`FormFieldEditPanel.tsx`, `FormFieldOptionsSection.tsx`) because the `FormFieldFormValues` type was manually written and diverged from the `z.infer<typeof formFieldFormSchema>`.
**Learning:** `z.string().optional().default('')` resolves to `string | undefined` in Zod infer, causing type misalignment.
**Standard:** Use `z.infer` to strictly derive Form types from the schema instead of manually typing. Use `.catch(default_value)` instead of `.default(default_value)` in schemas to enforce stricter required types without optional boundaries when it does not need to be optional in the form state. Then use `FieldErrors<T>` instead of raw `Record<string, unknown>` and `any` assertions to manage field errors correctly.

## 2026-09-30 - [Derived State Over Local State Sync]

**Deviation:** Duplicating prop data (`eventData`) into local state (`isOpen`) using `useEffect` in `PublishEventDialog.tsx`.
**Learning:** This is a classic anti-pattern that creates unnecessary renders and risks state de-synchronization. The component was also relying on an `eslint-disable react-hooks/set-state-in-effect` comment to bypass standard linting rules.
**Standard:** Compute derived values directly during render. The `isOpen` state for the dialog can be determined purely by the truthiness of the `eventData` prop (`isOpen={Boolean(eventData)}`).
