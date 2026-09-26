## 2024-09-24 - Visible Focus States on Custom Collapsible Elements

**Learning:** Custom interactive elements, like the toggle button in a collapsible accordion or section card, often miss out on native browser focus outlines. When elements use `focus:outline-none`, keyboard users lose their place entirely unless a visible alternative is provided. `CollapsibleSectionCard` in this repo lacked focus rings on its toggle buttons.
**Action:** Always ensure `focus-visible:ring-2 focus-visible:ring-primary/50` (or similar project-specific focus tokens) are added to any interactive custom components, particularly those using `focus:outline-none`. Additionally, adding `rounded-md` helps the focus ring match the element's natural shape.

## 2024-09-24 - Loading Spinners in Submit Buttons

**Learning:** Submit buttons for login using providers missed a clear visual cue in loading state when a user starts logging in. Buttons missing such states can seem unresponsive to the users and lead to repeated clicks or confusion.
**Action:** Add a spinner for any async data processing inside buttons when in pending state. Ensure that `Loader2` component from `lucide-react` is added to pending states and appropriately styled with `animate-spin`.

## 2024-09-26 - Missing focus states and implicit form submission

**Learning:** Custom interactive elements (e.g. `CopyButton` inside `ChatMessageContent`) that lack explicit `type="button"` declarations could inadvertently submit adjacent forms if placed inside one. Additionally, the lack of `focus-visible` styles makes the element invisible to keyboard navigation.
**Action:** Always ensure explicitly set `type="button"` on `<button>` elements that are not acting as form submissions. Also ensure `focus-visible:ring-2 focus-visible:ring-primary/50` is added to custom interactive elements, especially if `focus:outline-none` is used.
