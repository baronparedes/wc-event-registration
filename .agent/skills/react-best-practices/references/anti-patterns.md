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
