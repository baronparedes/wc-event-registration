## 2025-02-15 - Role-Based Permission Rendering

**Challenge:** Testing the visibility of action buttons within the events table based on specific combinations of boolean permission flags (`canWrite`, `canRead`, `canAccessCheckIn`).
**Learning:** The component uses multiple separate boolean flags rather than a single role enum to dictate UI visibility, requiring tests to isolate each flag's effect to ensure no cross-contamination between required states (e.g. `canRead` vs `canWrite` buttons).
**Pattern:** Setup a highly reusable setup function for the component that accepts partial prop overrides. Create distinct `describe` blocks where each test asserts the explicit presence _and_ absence of buttons based on the isolated permission state under test.

## 2023-10-27 - useIsMobileViewport hook

**Challenge:** Testing a hook that interacts with window.innerWidth and listens to resize events.
**Learning:** `window.innerWidth` is a read-only property in standard DOM environments, but in Vitest with JSDOM/Happy-DOM, it can be mocked using `Object.defineProperty`. We must also remember to restore its original value after each test. We need to dispatch a 'resize' event to trigger the internal listener.
**Pattern:**

```typescript
Object.defineProperty(window, 'innerWidth', { value: 767 });
const { result } = renderHook(() => useIsMobileViewport());
expect(result.current).toBe(true);

act(() => {
  Object.defineProperty(window, 'innerWidth', { value: 800 });
  window.dispatchEvent(new Event('resize'));
});
expect(result.current).toBe(false);
```

## 2026-10-04 - Provider Requirements for UI Components

**Challenge:** Components like `SundayVolunteersTable` that use nested UI components (e.g., `<Avatar>`) fail in tests with 'No QueryClient set' because child components fetch data using React Query.
**Learning:** UI components cannot be tested in isolation if they use data-fetching children; they require the full application provider context.
**Pattern:** Always wrap components in a `QueryClientProvider` with a fresh `QueryClient` instance in tests to satisfy deep data dependencies.
## 2026-10-06 - Attendance Advanced Filters Card Tests
**Challenge:** Testing the dynamic fields required selecting dynamically populated UI dropdowns built with custom elements that abstract typical semantic HTML.
**Learning:** For FormSelectField dropdowns, we need to query by role 'button' since headless UI libraries often implement them that way. We can look for the option in the dom and click it.
**Pattern:** For , use `screen.getByRole('button', { name: 'Label' })` to click and open it, then `screen.getAllByText('Option Text')` and filter for elements mimicking the 'option' role to execute selection interactions.
## 2026-10-05 - Attendance Advanced Filters Card Tests
**Challenge:** Testing the dynamic fields required selecting dynamically populated UI dropdowns built with custom elements that abstract typical semantic HTML.
**Learning:** For FormSelectField dropdowns, we need to query by role 'button' since headless UI libraries often implement them that way. We can look for the option in the dom and click it.
**Pattern:** For `FormSelectField`, use `screen.getByRole('button', { name: 'Label' })` to click and open it, then `screen.getAllByText('Option Text')` and filter for elements mimicking the 'option' role to execute selection interactions.
