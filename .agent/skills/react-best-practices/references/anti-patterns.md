# React Anti-Patterns

A catalog of common mistakes, why they are wrong, and how to fix them.

---

## 1. useState for Form Fields

**Problem:** Managing form field values in `useState` leads to boilerplate, stale value bugs, and missing validation lifecycle.

```tsx
// ❌ Wrong
const [email, setEmail] = useState('');
<input value={email} onChange={(e) => setEmail(e.target.value)} />;
```

**Fix:** Use React Hook Form's `register()`.

```tsx
// ✅ Correct
<FormInputField label="Email" registration={register('email')} />
```

---

## 2. useEffect to Sync Derived State

**Problem:** Mirroring props or other state into state via `useEffect` creates stale intermediate renders and violates lint rules.

```tsx
// ❌ Wrong
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
```

**Fix:** Derive inline or with `useMemo`.

```tsx
// ✅ Correct
const fullName = `${firstName} ${lastName}`;
```

---

## 3. Conditional Hook Calls

**Problem:** Hooks called inside conditions will throw a React error and produce inconsistent behavior.

```tsx
// ❌ Wrong
if (isAdmin) {
  const data = useAdminQuery(); // violates Rules of Hooks
}
```

**Fix:** Call the hook unconditionally; gate usage of its result.

```tsx
// ✅ Correct
const { data } = useAdminQuery()
if (!isAdmin) return null
```

---

## 4. Missing Effect Cleanup

**Problem:** Timers, subscriptions, and event listeners that are not cleaned up cause memory leaks and stale closures.

```tsx
// ❌ Wrong
useEffect(() => {
  setTimeout(() => setVisible(false), 3000);
}, []);
```

**Fix:** Always return a cleanup function that clears local handles.

```tsx
// ✅ Correct
useEffect(() => {
  const id = setTimeout(() => setVisible(false), 3000);
  return () => clearTimeout(id);
}, []);
```

---

## 5. Prop Drilling Beyond 2 Levels

**Problem:** Passing props through many intermediate components creates tight coupling and makes refactoring painful.

**Fix options:**

- Lift state only as high as needed.
- Use composition (`children`) so the leaf component can access context naturally.
- Use React context for truly app-wide state (auth, theme).
- Use a shared query hook so both components fetch their own slice.

---

## 6. Monolithic Page Components

**Problem:** A single page component that fetches data, manages multi-step form flow, and renders all UI becomes impossible to maintain.

**Fix:** Apply the orchestration/presentation split.

- Page = query hooks + loading/empty/error state + routing.
- Section components = receive props, render UI, own only their local open/close state.
- Action dialog components = own trigger + open/close internally.

---

## 7. Silently Swallowing Errors

**Problem:** Catching errors without surfacing them to the user or logging them makes debugging impossible.

```tsx
// ❌ Wrong
try {
  await submit();
} catch {
  // nothing
}
```

**Fix:** Convert to a user-safe message in UI and log details.

```tsx
// ✅ Correct
try {
  await submit();
} catch (err) {
  logger.error('Submit failed', err);
  toast.error('Something went wrong. Please try again.');
}
```

---

## 8. Storing Server Data in Local State

**Problem:** Copying React Query data into `useState` creates a stale second copy.

```tsx
// ❌ Wrong
const { data } = useEventsQuery();
const [events, setEvents] = useState(data); // stale after refetch
```

**Fix:** Read directly from the query result; do not copy to local state.

```tsx
// ✅ Correct
const { data: events, isLoading } = useEventsQuery();
```

---

## 9. Anonymous Object/Array Props Breaking Memoization

**Problem:** Passing `{}` or `[]` literals in JSX creates a new reference on every render.

```tsx
// ❌ Wrong — new object every render
<Chart options={{ animate: true }} />
```

**Fix:** Hoist stable values outside the component or use `useMemo`.

```tsx
// ✅ Correct
const chartOptions = { animate: true }; // outside component or useMemo
<Chart options={chartOptions} />;
```

---

## 10. Any Type and Unsafe Casts

**Problem:** Using `any` or `as SomeType` bypasses TypeScript's safety net.

```tsx
// ❌ Wrong
const data = response as UserProfile; // assumes shape without validation
```

**Fix:** Use Zod to validate external data at the boundary; derive types with `z.infer`.

```tsx
// ✅ Correct
const result = UserProfileSchema.safeParse(response);
if (!result.success) throw new Error('Invalid profile shape');
const data: UserProfile = result.data;
```

---

## 11. Leaking Global Listeners on Inactive Overlays

**Problem:** Registering `document` or `window` event listeners (e.g., click-outside `mousedown` or `Escape` keydown) in an effect without guarding on the active/open state causes every mounted instance to listen to global user interactions even while hidden.

```tsx
// ❌ Wrong: Listens continuously to all mouse/keyboard events on document
useEffect(() => {
  function handleOutside(e: MouseEvent) {
    if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
  }
  document.addEventListener('mousedown', handleOutside);
  return () => document.removeEventListener('mousedown', handleOutside);
}, [isOpen]);
```

**Fix:** Return early if the overlay is not active.

```tsx
// ✅ Correct: Only attaches listeners while open
useEffect(() => {
  if (!isOpen) return;

  function handleOutside(e: MouseEvent) {
    if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
  }
  document.addEventListener('mousedown', handleOutside);
  return () => document.removeEventListener('mousedown', handleOutside);
}, [isOpen]);
```

---

## 12. Broken `useMemo` Cache via Unstable Dependency References

**Problem:** Passing newly allocated objects, arrays, or functions into a dependency array causes reference equality checks (`===`) to fail on every render, invalidating the memoized cache 100% of the time while still incurring memoization overhead.

```tsx
// ❌ Wrong: parseDays() returns a brand new array reference on every render
const days = parseDays(prop);
const disabled = useMemo(() => buildDisabled(days), [days]);

// ❌ Wrong: Passing inline object literal into child props that memoizes on it
<Child config={{ count: 1 }} />;
```

**Fix:** Ensure dependency references remain stable, or inline the cheap computation during render instead of memoizing.

```tsx
// ✅ Correct: Extract stable values or derive inline
const days = useMemo(() => parseDays(prop), [prop]);
const disabled = useMemo(() => buildDisabled(days), [days]);
```

---

## 13. Premature/Trivial `useMemo` on Cheap Primitives & Fallbacks

**Problem:** Wrapping primitive boolean/string expressions, simple arithmetic, or nullish fallbacks in `useMemo` adds hook state tracking, dependency comparison, and closure allocation that costs more CPU and memory than inline calculation.

```tsx
// ❌ Wrong
const isBlocked = useMemo(() => a || b, [a, b]);
const percentage = useMemo(() => Math.round((count / total) * 100), [count, total]);
const items = useMemo(() => rawItems ?? [], [rawItems]);
```

**Fix:** Derive inline during render.

```tsx
// ✅ Correct
const isBlocked = a || b;
const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
const items = rawItems ?? [];
```

---

## 14. Triggering Mutations & Submissions in `useEffect` (Cascading Effects)

**Problem:** Initiating mutations, form submissions, or auto-transitions inside `useEffect` creates cascading render passes, race conditions, and requires brittle `useRef` mutex guards to prevent infinite loops.

```tsx
// ❌ Wrong: Mutation triggered by reactive state observation
useEffect(() => {
  if (dataReady && !isSubmittingRef.current) {
    isSubmittingRef.current = true;
    submitMutation();
  }
}, [dataReady]);
```

**Fix:** Trigger mutations directly within event handlers (e.g. after a lookup or scan finishes successfully).

```tsx
// ✅ Correct: Action triggered directly from the event
async function handleScan(barcode: string) {
  const result = await lookup(barcode);
  if (result.matched) {
    await submitRegistration();
  }
}
```

---

## 15. Orphaned/Dead State without Corresponding Controls

**Problem:** Declaring `useState` variables and conditional rendering logic without providing corresponding input elements or updates leaves dead code and confusing UX.

**Fix:** Ensure interactive state has full control coverage (e.g., an actual input/textarea for user feedback) or remove unused state.
