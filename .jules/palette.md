## 2025-02-18 - Added `title` to icon-only buttons globally
**Learning:** While most icon-only buttons successfully leverage `aria-label` for screen-reader accessibility, they consistently lacked the native `title` attribute. Sighted users relying on a mouse/pointer didn't have a reliable visual indicator (tooltip) of what the icons did, which is a common UX gap for purely iconic interfaces.
**Action:** Always inject `title={ariaLabel}` directly beside `aria-label={ariaLabel}` in custom UI buttons and navigation icons to ensure parity between visual tooltips and screen reader descriptions.
