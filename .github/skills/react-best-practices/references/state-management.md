# State Management

## State Type Map

| What you're tracking                         | Correct tool                            |
| -------------------------------------------- | --------------------------------------- |
| Form field values                            | React Hook Form — never `useState`      |
| Server / async data                          | React Query (`useQuery`, `useMutation`) |
| Modal open/close, tabs, selected item        | `useState`                              |
| Values computed from other state/props       | `useMemo` or inline derivation          |
| Values shared across many distant components | React context (sparingly)               |

## The Golden Rule

**Do not duplicate state.** If a value can be derived from existing state or props, derive it — don't store it separately and keep it in sync.

```tsx
// ❌ Duplicated state — both pieces track the same truth
const [items, setItems] = useState([])
const [count, setCount] = useState(0)

// ✅ Derived — count comes from items
const [items, setItems] = useState([])
const count = items.length // or useMemo if expensive
```

## Local UI State (useState)

Use `useState` only for:

- Toggle states: `isOpen`, `isEditing`, `isExpanded`
- Step/tab index in a local multi-step flow
- Transient selection state not shared outside the component

Do NOT use for:

- Form field values (use RHF)
- Server data (use React Query)
- Any value that can be computed

## Server State (React Query)

- All data fetching happens in custom hooks under `src/hooks/domain/`.
- Hooks inline Supabase or Edge Function calls directly in `queryFn` — no intermediate wrapper layer.
- Use stable, typed query keys from `src/config/constants/queryKeys.ts`.
- Handle `isLoading`, empty (`data?.length === 0`), and `isError` states explicitly at the page level.
- Invalidate after mutations using `queryClient.invalidateQueries` — only on success, never on error.

```tsx
// ✅ After mutation success
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.events.admin() })
}
```

## Derived State (useMemo)

Use `useMemo` when a value is expensive to compute and recalculates on every render unnecessarily.

```tsx
// ✅ Memoize expensive filter/sort
const sorted = useMemo(() => items.slice().sort((a, b) => a.name.localeCompare(b.name)), [items])

// ❌ Over-memoization — this is not expensive, just derive inline
const label = useMemo(() => `Hello, ${name}`, [name])
// ✅ Just write:
const label = `Hello, ${name}`
```

## Context (Use Sparingly)

Context is appropriate for:

- Auth state shared app-wide
- Theme or locale settings

Context is NOT appropriate for:

- Server data (use React Query)
- Form state (use RHF)
- State that changes frequently (causes broad re-renders)

## Anti-Patterns

| Anti-pattern                                   | Fix                                       |
| ---------------------------------------------- | ----------------------------------------- |
| `useState` for form fields                     | Use `register()` from RHF                 |
| `useEffect` to sync derived state              | Derive inline or use `useMemo`            |
| Storing React Query data in `useState`         | Read directly from `useQuery` result      |
| Multiple `useState` for closely related values | Group into one object or use `useReducer` |
| Context for frequently-changing state          | Use React Query or local state            |
