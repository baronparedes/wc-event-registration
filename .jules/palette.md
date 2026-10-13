## 2026-10-04 - Keyboard Accessibility on Custom Buttons

**Learning:** When making a generic element like a `<div>` interactive in this codebase, adding focus styles (like `focus-visible:ring-2`) is not enough for keyboard accessibility. The element must also explicitly receive `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler to respond to 'Enter' and 'Space' keys natively. Without these, focus indicators are ignored by the browser.
**Action:** Next time I make a custom element clickable, I should prefer converting it to a native `<button>` element if possible. If sticking to a `<div>` is required by the design context, I must include all semantic ARIA and keyboard interaction attributes in addition to the focus styling.

## 2024-10-25 - Prevent Focus Ring Truncation in Dialogs

**Learning:** `overflow-x-hidden` on dialog and modal containers clips the box-shadows (focus rings) of full-width form inputs inside them.
**Action:** Remove `overflow-x-hidden` from `Dialog` and `DialogBody` components, allowing box-shadows to bleed safely into the dialog padding without being truncated.
