## 2024-09-24 - Visible Focus States on Custom Collapsible Elements

**Learning:** Custom interactive elements, like the toggle button in a collapsible accordion or section card, often miss out on native browser focus outlines. When elements use `focus:outline-none`, keyboard users lose their place entirely unless a visible alternative is provided. `CollapsibleSectionCard` in this repo lacked focus rings on its toggle buttons.
**Action:** Always ensure `focus-visible:ring-2 focus-visible:ring-primary/50` (or similar project-specific focus tokens) are added to any interactive custom components, particularly those using `focus:outline-none`. Additionally, adding `rounded-md` helps the focus ring match the element's natural shape.
