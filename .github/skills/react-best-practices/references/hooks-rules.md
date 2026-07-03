# Hooks Rules

## The Two Laws

1. **Only call hooks at the top level.** Never inside loops, conditionals, or nested functions.
2. **Only call hooks from React functions.** Never from regular JS functions or class components.

## Placement Before Early Returns

Hooks must be declared before any conditional early return.

```tsx
// ✅ Correct
function Component({ id }: Props) {
  const { data, isLoading } = useQuery(id);  // hook before return
  if (!id) return null;
  return <div>{data?.name}</div>;
}

// ❌ Wrong — hook after conditional
function Component({ id }: Props) {
  if (!id) return null;
  const { data } = useQuery(id);  // will throw a lint error
  return <div>{data?.name}</div>;
}
```

## Do NOT Mirror Props Into State

Mirroring props into state with `useEffect` to "keep them in sync" creates stale state bugs and violates lint rules.

```tsx
// ❌ Anti-pattern: mirroring prop into state
const [name, setName] = useState(props.name);
useEffect(() => { setName(props.name); }, [props.name]);

// ✅ Derive at render time instead
const displayName = props.name ?? 'Anonymous';
```

Exception: if you need **editable** state initialized from a prop (e.g., an input pre-filled with a server value), initialize `useState` once and do not sync it — use `reset(data)` from React Hook Form for forms.

## Do NOT Call setState Synchronously in Effects

```tsx
// ❌ Wrong: synchronous state update in effect causes double render
useEffect(() => {
  setCount(count + 1);
}, [count]);

// ✅ Correct: effect syncs with an external system
useEffect(() => {
  const subscription = externalStore.subscribe(setCount);
  return () => subscription.unsubscribe();
}, []);
```

## Effect Cleanup Pattern

Always capture cleanup handles in local variables inside the effect.

```tsx
// ✅ Correct
useEffect(() => {
  const timerId = setTimeout(() => doSomething(), delay);
  return () => clearTimeout(timerId);
}, [delay]);

// ❌ Wrong: cleaning up a ref that may have changed by the time cleanup runs
useEffect(() => {
  timerRef.current = setTimeout(() => doSomething(), delay);
  return () => clearTimeout(timerRef.current!); // stale ref bug
}, [delay]);
```

## Custom Hook Guidelines

- One hook per file.
- Name with `use` prefix always.
- Export exactly one hook function per file.
- Hooks own their data fetching logic — no separate query/command wrapper layers.
- Keep custom hooks focused: queries (`use<Entity>Query`), mutations (`use<Action><Entity>Mutation`), state (`use<Entity>State`).

## useWatch vs watch (React Hook Form)

Prefer `useWatch()` over `watch()` when subscribing to field values for rendering or conditional UI.

```tsx
// ✅ Preferred
const fieldValue = useWatch({ control, name: 'myField' });

// ⚠️ Use only for one-off reads, not for render subscriptions
const fieldValue = watch('myField');
```
