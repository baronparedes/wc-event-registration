## 2026-09-30 - [Strict Type Alignment with Zod Inference]

**Deviation:** Found explicit `as any` and `eslint-disable-next-line @typescript-eslint/no-explicit-any` workarounds in form field validation components (`FormFieldEditPanel.tsx`, `FormFieldOptionsSection.tsx`) because the `FormFieldFormValues` type was manually written and diverged from the `z.infer<typeof formFieldFormSchema>`.
**Learning:** `z.string().optional().default('')` resolves to `string | undefined` in Zod infer, causing type misalignment.
**Standard:** Use `z.infer` to strictly derive Form types from the schema instead of manually typing. Use `.catch(default_value)` instead of `.default(default_value)` in schemas to enforce stricter required types without optional boundaries when it does not need to be optional in the form state. Then use `FieldErrors<T>` instead of raw `Record<string, unknown>` and `any` assertions to manage field errors correctly.
