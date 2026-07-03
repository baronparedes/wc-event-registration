# Performance

## Default Stance: Don't Optimize Prematurely

Add memoization only when you have evidence of a problem — profiler results, dropped frames, or measurable slow renders. Premature memoization adds complexity and can actually hurt performance if dependencies are unstable.

## useMemo

Use when a value is **expensive to compute** and recomputes on every render.

```tsx
// ✅ Appropriate — sorting/filtering a large list
const filteredItems = useMemo(
  () => items.filter((i) => i.status === activeStatus),
  [items, activeStatus],
)

// ❌ Over-memoized — string template is not expensive
const title = useMemo(() => `Hello, ${name}`, [name])
```

## useCallback

Use only when passing a **stable callback to a memoized child** component.

```tsx
// ✅ Appropriate — child is wrapped in React.memo
const handleDelete = useCallback(
  (id: string) => {
    deleteItem(id)
  },
  [deleteItem],
)

// ❌ Over-memoized — child is not memoized, callback stability doesn't matter
const handleClick = useCallback(() => setOpen(true), [])
```

## React.memo

Wrap a component in `React.memo` when:

- It re-renders frequently.
- Its props are stable (primitive values or memoized objects/functions).
- Profiling confirms unnecessary re-renders are a problem.

```tsx
const Row = React.memo(function Row({ item }: { item: Item }) {
  return <li>{item.name}</li>
})
```

## Avoid Unstable Props

Anonymous objects, arrays, and functions in JSX create new references on every render, breaking memoization.

```tsx
// ❌ New object on every render — breaks React.memo
;<Table config={{ density: 'compact' }} />

// ✅ Stable reference
const tableConfig = useMemo(() => ({ density: 'compact' }), [])
;<Table config={tableConfig} />
```

## useWatch for Scoped Subscriptions

`useWatch()` limits re-renders to the subscribing component, while `watch()` can cause parent re-renders.

```tsx
// ✅ Only this component re-renders when field changes
const value = useWatch({ control, name: 'quantity' })
```

## Code Splitting

- Lazy-load heavy page components with `React.lazy` + `Suspense`.
- Keep route-level chunks separate so users only load code they need.
- Do not lazy-load small shared UI components — the overhead outweighs the savings.

## What NOT to Optimize

- Simple `useState` toggles — no memoization needed.
- Short lists (<100 items) — virtualization is not needed.
- Components that render once and are not in hot paths.
- Callbacks that are not passed to memoized children.
