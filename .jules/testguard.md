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

## 2025-02-27 - Locale Mocking in Vitest

**Challenge:** Tests for date formatting utility functions `toLocaleDateString` and `toLocaleString` pass locally but fail in CI environments due to differing default locales and timezones.
**Learning:** `Date.prototype.toLocaleDateString` and `Date.prototype.toLocaleString` defaults to system settings, causing unpredictable outputs depending on where tests are run (e.g. CI servers).
**Pattern:** Always use `vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('Expected Value')` or explicitly pass `locale` parameter and `timeZone` in tests to ensure consistency across environments.

## $(date +%Y-%m-%d) - Unit testing component with nested sub-components needing specific props

**Challenge:** Testing `EventCoverPhotoUpload` required triggering its internal sub-component (`CoverPhotoCropDialog`) to fire the `onApplyCrop` handler.
**Learning:** React Testing Library is constrained when a sub-component behaves as an uncontrolled overlay if its actual rendering is complex or relies on external APIs (like `html-to-image`).
**Pattern:** Mock the complex sub-component globally using `vi.mock('../CoverPhotoCropDialog', () => { ... })` to return a simpler inline element that explicitly exposes buttons to trigger the prop functions, allowing easy simulation of complex async child behavior within the parent test.

## 2024-10-13 - Testing Custom React Contexts

**Challenge:** Missing test coverage on `useImageCanvasContext` related to throwing an error outside a provider or properly retrieving values.
**Learning:** Context value hooks often contain specific logic for error handling when invoked outside their matching Provider.
**Pattern:** To reach full coverage on custom contexts, use `renderHook` from React Testing Library in combination with `toThrow` to test the non-provider exception case, and use the `wrapper` configuration option in `renderHook` to verify behavior inside the provider. Suppress console output for the expected error to prevent cluttering standard test runs.
## 2024-10-15 - ExportMissedCommitmentsButton Testing
**Challenge:** Testing the dynamic generation and download of CSV files via `URL.createObjectURL` and a dummy anchor tag in a JSDOM environment is tricky, as it relies heavily on native DOM functions that don't map cleanly or consistently during test execution.
**Learning:** The component manually creates an `<a>` tag, appends it to the body, calls `click()`, and cleans it up. Simulating this exact native browser behavior is brittle.
**Pattern:** Mock `URL.createObjectURL` and `URL.revokeObjectURL` before each test. Spy on `HTMLAnchorElement.prototype.click` rather than intercepting `document.createElement`. This safely and reliably asserts that the anchor tag was created and clicked without mutating global DOM constructors.
