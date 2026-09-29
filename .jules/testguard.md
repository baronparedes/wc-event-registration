## 2025-02-15 - Role-Based Permission Rendering

**Challenge:** Testing the visibility of action buttons within the events table based on specific combinations of boolean permission flags (`canWrite`, `canRead`, `canAccessCheckIn`).
**Learning:** The component uses multiple separate boolean flags rather than a single role enum to dictate UI visibility, requiring tests to isolate each flag's effect to ensure no cross-contamination between required states (e.g. `canRead` vs `canWrite` buttons).
**Pattern:** Setup a highly reusable setup function for the component that accepts partial prop overrides. Create distinct `describe` blocks where each test asserts the explicit presence _and_ absence of buttons based on the isolated permission state under test.
