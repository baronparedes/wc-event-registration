---
name: react-ui-patterns
description: 'Repository UI design system patterns, component composition, and layout conventions. Covers: AdminPageShell, ListTable, MobileCard, ButtonGroup, SearchInputField, Avatar, Badge, Dialog, and strict theme token enforcement.'
---

# React and UI Patterns

**Context:** This skill covers the design system, component composition standards, and layout conventions for building frontend user interfaces in this repository.

---

## 1. Theme, Colors & Dark Mode Constraints

- **Strict Prohibition of `dark:` Modifiers:** NEVER use Tailwind's `dark:` variant classes (e.g., `dark:bg-neutral-900`, `dark:text-neutral-100`). The application's theme is driven exclusively by CSS variables defined on `:root` (`--color-background`, `--color-surface`, `--color-text`, `--color-primary`, etc.) and does not support media-query dark mode. `dark:` classes break contrast on devices with OS dark mode enabled.
- **Semantic Color Tokens:** Restrict color classes to design tokens defined in `tailwind.config.js`:
  - Backgrounds & Surfaces: `bg-background`, `bg-surface`
  - Typography: `text-text`, `text-muted`
  - Borders: `border-border`
  - Accents & Status: `text-primary`, `bg-primary`, `bg-secondary`, `bg-accent`, `text-danger`
  - Avoid raw color utilities (`neutral-*`, `gray-*`, `slate-*`) for general page containers, cards, tables, and text.

---

## 2. Admin Page Layout Architecture

Every Admin listing, dashboard, or management page must follow the standard shell architecture:

```tsx
import { AdminBaseNavigation } from '@/components/layout/AdminBaseNavigation';
import { AdminPageShell } from '@/components/layout/AdminPageShell';

export function AdminFeaturePage() {
  return (
    <AdminPageShell>
      <AdminPageShell.Header
        navigation={<AdminBaseNavigation />}
        title="Page Title"
        description="Concise description of the administrative view."
        actions={<Button>Primary Action</Button>}
      />

      <AdminPageShell.Filters>
        {/* Status filters, search fields, and dropdowns */}
      </AdminPageShell.Filters>

      <AdminPageShell.Content>{/* Desktop ListTable or MobileCard list */}</AdminPageShell.Content>
    </AdminPageShell>
  );
}
```

---

## 3. Responsive Data Views: Desktop Table vs Mobile Cards

Admin lists must be responsive using the `useIsMobileViewport` hook:

- **Desktop View (`!isMobile`)**: Render using `ListTable` primitives:
  - `ListTable`
  - `ListTableHead`, `ListTableHeaderRow`, `ListTableHeaderCell`
  - `ListTableBody`, `ListTableRow`, `ListTableCell`
- **Mobile View (`isMobile`)**: Render using `MobileCard` primitives:
  - `MobileCard`
  - `MobileCardHeader`, `MobileCardBody`, `MobileCardContent`, `MobileCardActions`

```tsx
const isMobile = useIsMobileViewport();

{
  isMobile ? (
    <div className="space-y-3">
      {items.map((item) => (
        <MobileCard key={item.id}>
          <MobileCardHeader>...</MobileCardHeader>
          <MobileCardBody>...</MobileCardBody>
        </MobileCard>
      ))}
    </div>
  ) : (
    <ListTable>
      <ListTableHead>
        <ListTableHeaderRow>
          <ListTableHeaderCell>Name</ListTableHeaderCell>
          <ListTableHeaderCell>Status</ListTableHeaderCell>
        </ListTableHeaderRow>
      </ListTableHead>
      <ListTableBody>
        {items.map((item) => (
          <ListTableRow key={item.id}>
            <ListTableCell>...</ListTableCell>
          </ListTableRow>
        ))}
      </ListTableBody>
    </ListTable>
  );
}
```

---

## 4. Filter Toolbars & Controls

- **Filter Pills / Tabs**: Use `ButtonGroup` with `size="sm"` or `size="md"` for status filters (e.g., `All`, `Pending`, `Approved`, `Rejected`).
- **Search Inputs**: Use `SearchInputField` with debounced search state.
- **Select / Dropdown Filters**: Use `FormSelectField` or standard styled selects with `bg-surface border-border text-text`.

---

## 5. Person & User Representation (Avatars)

Whenever rendering users, volunteers, requesters, or attendees in lists, tables, cards, dialogs, or detail drawers:

- ALWAYS include the `Avatar` component (`src/components/ui/Avatar.tsx`).
- Provide `avatarObjectKey` (or photo URL) and `name` for fallback initials:
  ```tsx
  <Avatar
    avatarObjectKey={item.user?.avatar_object_key}
    name={item.user?.full_name}
    className="h-9 w-9 ring-1 ring-border"
  />
  ```

---

## 6. Status Indicators & Badges

- Use the shared `Badge` component (`src/components/ui/Badge.tsx`) with semantic variants:
  - `default`: Primary teal accent
  - `secondary`: Sage / secondary teal
  - `accent`: Warm amber / gold
  - `destructive`: Red danger / rejection
  - `outline`: Bordered neutral
- Do not construct arbitrary ad-hoc colored `<div>` tags for status indicators.

---

## 7. Dialogs & Modals

- Compose dialogs using the compound component pattern:
  - `<Dialog isOpen={isOpen} onClose={handleClose} size="lg">`
  - `<Dialog.Header showCloseButton onClose={handleClose}>`
  - `<Dialog.Title>...</Dialog.Title>`
  - `<Dialog.Description>...</Dialog.Description>`
  - `<Dialog.Body>`
  - `<Dialog.Footer>`
- **Avoid Blind `overflow-y-auto` on `Dialog.Body`**:
  - The root `Dialog` overlay container already provides smooth page-level scrolling. Do not apply `max-h-[...]` or `overflow-y-auto` to `Dialog.Body` when the dialog content naturally fits in the viewport.
  - Adding `overflow-y-auto` to `Dialog.Body` creates jarring double-scrollbars and traps/clips floating popovers and dropdowns (`FormSelectField`).
- **Colocate Scrolling on Inner Dynamic Lists**:
  - When a dialog has a long, variable list (e.g., dynamic questions, attendee lists, search results), apply scrolling directly to the list container (`<div className="max-h-[50vh] space-y-2.5 overflow-y-auto pr-1">`).
  - This ensures headers, tab bars, and action footers remain sticky and fully visible without requiring the user to hunt or scroll for submit/cancel buttons.
- **Modal Form Hierarchy & Occlusion**:
  - Place primary content inputs (e.g. textareas) first, and secondary dropdowns/settings below them. This prevents open dropdown menus from occluding the user's primary workspace.
  - In modal textareas, always use `textareaClassName="resize-none"` to prevent manual textarea resizing from breaking dialog boundaries.
- **Dialog Footer Buttons Full Width on Mobile**:
  - Keep action buttons as direct children (or inside React fragments `<>`) of `Dialog.Footer` without unnecessary intermediate wrapping `<div>`s.
  - `Dialog.Footer` automatically applies `flex-col-reverse sm:flex-row [&>button]:w-full sm:[&>button]:w-auto` to render full-width stacked buttons on mobile and auto-width inline buttons on desktop.
- Avoid putting raw submission mutations inside `useEffect`; trigger actions directly from buttons in the dialog footer or event handlers.

---

## 8. General UI Conventions

- **Zero Invention of Domain Terminology**: NEVER invent arbitrary labels, uppercase headers, or synthetic select options (e.g., inventing `"TARGET AUDIENCE"`, `"Church Members Only"`, or `"Open Public Only"`). Always check existing domain pages and schemas to reuse established copy, casing, and value mappings.
- **Form Component Label Props**: Always pass `label="..."` directly to shared form primitives (`FormSelectField`, `FormInputField`, `FormTextareaField`) rather than creating detached custom `<label>` tags.
- **Dropdown Placeholder Discipline**: When a required `FormSelectField` has a default valid selection, pass `placeholder=""` to avoid rendering an unwanted `"Select..."` choice that resets required state.
- **Avoid External UI Libraries:** Avoid pulling in external headless UI libraries for simple components (e.g. tabs). Implement them with custom React state and standard HTML `<button>` elements styled with Tailwind CSS.
- **Utilize Existing Primitives:** Make use of the existing shared UI primitives in `src/components/ui/` (`Button`, `Dialog`, `FormInputField`, `SearchInputField`, `ButtonGroup`, `Avatar`, `Badge`) rather than rebuilding them.
- **Global Toast Notifications:** Use the `sonner` library for global toast notifications. The primary `<Toaster />` provider component is configured and managed in `src/App.tsx`.
- **Login CTA:** The login page (`/src/pages/login`) strongly prioritizes Google Sign-In as the primary Call-To-Action. Traditional email/password admin login is hidden behind a toggle button.
