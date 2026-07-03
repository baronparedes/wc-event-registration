# Forms — React Hook Form + Zod

## Mandatory Pattern

All forms must follow this pattern:

```ts
// 1. Define Zod schema
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
});

// 2. Infer form type
type MyForm = z.infer<typeof schema>;

// 3. Initialize form
const form = useForm<MyForm>({
  resolver: zodResolver(schema),
  defaultValues: { email: '', name: '' },
});

// 4. Extract what you need from formState once at top level
const { register, handleSubmit, formState: { errors, isDirty, isValid }, reset } = form;

// 5. Pass register() to shared field primitives
<FormInputField
  label="Email"
  registration={register('email')}
  error={errors.email?.message}
/>
```

## Field Registration Modes

| Mode       | When to use                                      | Pattern                                     |
| ---------- | ------------------------------------------------ | ------------------------------------------- |
| Registered | Simple fields (text, select, textarea)           | `registration={register('fieldName')}`      |
| Controlled | Dynamic fields, conditional rendering, custom UI | `value={watch('fieldName')} onChange={...}` |

Prefer registered mode. Use controlled only when `watch()` is needed for conditional UI.

## useWatch vs watch for Subscriptions

```tsx
// ✅ Preferred for render subscriptions
const category = useWatch({ control: form.control, name: 'category' })

// ⚠️ Use sparingly — triggers re-render on every watched field change
const category = form.watch('category')
```

## Edit Mode Pattern

```tsx
// Load existing data into the form
useEffect(() => {
  if (data) reset(data) // reset sets defaultValues and clears dirty state
}, [data, reset])

// Gate save button on dirty state
;<Button disabled={!isDirty || isSubmitting}>Save Changes</Button>
```

## Dirty State and Change Detection

- Use `isDirty` from `formState` to know if any field changed from defaults.
- Use `dirtyFields` to know which specific fields changed (useful for confirmation dialogs).
- Never duplicate change detection logic — RHF is the single source of truth.

```tsx
const {
  formState: { isDirty, dirtyFields },
} = form

// Show confirmation only if name changed
const nameChanged = !!dirtyFields.name
```

## Cross-Field Validation

Use Zod `superRefine` — do not add manual validation inside the component.

```ts
const schema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      })
    }
  })
```

## Common Mistakes

| Mistake                              | Fix                                                   |
| ------------------------------------ | ----------------------------------------------------- |
| `useState` for field values          | Use `register()` from RHF                             |
| `watch()` for all form subscriptions | Prefer `useWatch()` for scoped subscriptions          |
| Validation logic in component        | Move to Zod schema with `superRefine`                 |
| Not calling `reset()` in edit mode   | Call `reset(serverData)` when data loads              |
| Not gating save on `isDirty`         | Add `disabled={!isDirty}` to save button in edit mode |
| Reading `formState` inside effects   | Extract at top level, read the captured value         |
