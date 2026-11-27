# Welcome Hub — Design System & Style Guide (`DESIGN.md`)

This document defines the visual language, design tokens, layout architecture, UI primitives, and interaction standards for the **Welcome Hub** (WC Event Registration & Attendance Management) platform.

It serves both **human designers/engineers** and **AI agents** building or refining interfaces. For React architecture, TypeScript, hooks, and state management conventions, see [`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md) and [`AGENTS.md`](AGENTS.md).

---

## 1. Design Philosophy

Welcome Hub is a community-facing event registration, form submission, volunteer recruitment, and attendance platform used across desktop admin dashboards, personal mobile devices, and on-site kiosk tablets.

- **Calm, High-Clarity Light Canvas:** Built on cool slate-white surfaces (`#f8fafc` canvas, `#ffffff` cards) with subtle ambient radial washes and crisp borders (`#d7e0eb`).
- **Teal-Led Brand Identity:** Primary teal (`#1ca0b3`) drives primary actions, active states, and focus rings; sage secondary (`#51a29a`), indigo tertiary (`#6366f1`), warm amber accent (`#f5bd5c`), and coral danger (`#f2685c`) provide clear semantic differentiation.
- **Touch-First Ergonomics:** Interactive controls enforce a minimum `40px` (`2.5rem`) hit target globally, with mobile card actions and kiosk wizards scaling up to `48px+` (`min-h-12`) for effortless tap accuracy.
- **Primitives Over Custom CSS:** Always compose screens from shared primitives in `src/components/ui/` and `src/components/layout/` rather than inventing one-off cards, pills, or modals.

---

## 2. Color System & Semantic Tokens

All theme colors are defined as CSS custom properties on `:root` in [`src/index.css`](src/index.css) and mapped into Tailwind in [`tailwind.config.js`](tailwind.config.js).

### 2.1 Core Palette

| Semantic Token | CSS Variable         | Hex       | Tailwind Utilities                                             | Usage                                                                          |
| :------------- | :------------------- | :-------- | :------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Primary**    | `--color-primary`    | `#1ca0b3` | `bg-primary`, `text-primary`, `border-primary`, `ring-primary` | Primary CTAs, active tabs/pills, focus rings, current wizard step, links       |
| **Secondary**  | `--color-secondary`  | `#51a29a` | `bg-secondary`, `text-secondary`                               | Secondary actions, completed steps, pending/upcoming/walk-in badges            |
| **Tertiary**   | `--color-tertiary`   | `#6366f1` | `bg-tertiary`, `text-tertiary`                                 | Accent categorization, tertiary stat cards, specialty badges                   |
| **Accent**     | `--color-accent`     | `#f5bd5c` | `bg-accent`, `text-accent`                                     | Highlighted states, excused commitments, warm emphasis (pair with `text-text`) |
| **Background** | `--color-background` | `#f8fafc` | `bg-background`                                                | Page canvas, input backgrounds, subtle inset containers                        |
| **Surface**    | `--color-surface`    | `#ffffff` | `bg-surface`                                                   | Cards, dialogs, filter bars, tab tracks, dropdown panels                       |
| **Text**       | `--color-text`       | `#0f172a` | `text-text`                                                    | Primary headings, body copy, form labels, high-emphasis values                 |
| **Muted**      | `--color-muted`      | `#475569` | `text-muted`                                                   | Secondary copy, helper text, table headers, placeholders, icons                |
| **Border**     | `--color-border`     | `#d7e0eb` | `border-border`, `divide-border`                               | Card outlines, input borders, table dividers, dialog footer dividers           |
| **Danger**     | `--color-danger`     | `#f2685c` | `text-danger`, `bg-danger`, `border-danger`                    | Error states, destructive warnings, danger stat cards                          |

> **Note on Destructive Buttons & Alerts:** Destructive solid buttons (`Button variant="destructive"`) use `bg-red-600 text-white hover:bg-red-700` for WCAG AA contrast against white text, while inline field validation messages use `text-red-600` and `border-red-400`.

### 2.2 Ambient Page Canvas

The `<body>` background layers two soft radial gradients over `--color-background`:

```css
background:
  radial-gradient(circle at 12% -5%, rgba(11, 95, 255, 0.15), transparent 35%),
  radial-gradient(circle at 96% 22%, rgba(15, 118, 110, 0.12), transparent 42%),
  var(--color-background);
```

### 2.3 Strict Light-Only Policy (No `dark:` Modifiers)

- **NEVER use Tailwind `dark:` variant classes** (e.g., `dark:bg-neutral-900`, `dark:text-neutral-100`).
- The application theme is driven exclusively by `:root` CSS variables and does **not** support media-query dark mode. Adding `dark:` utilities causes unreadable white-on-white text or mismatched black cards on devices with OS dark mode enabled.
- **Avoid raw neutral palettes** (`neutral-*`, `gray-*`, `slate-*`) for general containers, cards, borders, or typography; always prefer `bg-surface`, `bg-background`, `border-border`, `text-text`, and `text-muted`.

### 2.4 Domain Semantic Color Scales

#### Alert Banners (`AlertBanner`)

| Variant   | Container                                     | Title / Description                 | Icon Color       |
| :-------- | :-------------------------------------------- | :---------------------------------- | :--------------- |
| `info`    | `border-blue-200 bg-blue-50 text-blue-900`    | `text-blue-900` / `text-blue-700`   | `text-blue-600`  |
| `warning` | `border-amber-200 bg-amber-50 text-amber-900` | `text-amber-900` / `text-amber-700` | `text-amber-600` |
| `error`   | `border-red-200 bg-red-50 text-red-900`       | `text-red-900` / `text-red-700`     | `text-red-600`   |
| `success` | `border-green-200 bg-green-50 text-green-900` | `text-green-900` / `text-green-700` | `text-green-600` |

#### Hub Calendar Attendance Rating Avatar Rings (`/admin/hub-calendar`)

| Attendance Rating Score | Tier            | Ring Token         |
| :---------------------- | :-------------- | :----------------- |
| `≥ 8`                   | Solid           | `ring-emerald-500` |
| `≥ 4`                   | Moderate        | `ring-indigo-500`  |
| `≥ 0`                   | Neutral / Watch | `ring-amber-500`   |
| `< 0`                   | At Risk         | `ring-rose-500`    |

---

## 3. Typography & Type Scale

### 3.1 Font Families

Loaded in [`index.html`](index.html) and mapped in [`tailwind.config.js`](tailwind.config.js):

- **UI / Headings / Body (`font-sans`, `font-heading`, `font-body`):** `'Arimo', Helvetica, Arial, sans-serif` (weights `400`, `500`, `600`, `700`, regular & italic).
- **Monospace (`font-mono`):** `'JetBrains Mono', monospace` (weights `500`, `600`) — used for RFID codes, slugs, member IDs, and structured identifiers.

### 3.2 Fluid Root Scale

```css
html {
  font-size: clamp(16px, 0.2vw + 15.75px, 17.5px);
}
body {
  font-family: var(--font-app);
  line-height: 1.6;
}
```

### 3.3 Type Hierarchy

| Role                                    | Classes                                                            | Typical Usage                                                  |
| :-------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------- |
| **Page Title (H1)**                     | `font-heading text-3xl font-bold text-text`                        | `AdminPageShell.Header` titles                                 |
| **Section Title (H2)**                  | `font-heading text-xl font-semibold text-text`                     | `SectionCard` titles                                           |
| **Dialog / Empty State Title**          | `font-heading text-lg font-semibold text-text`                     | `Dialog.Title`, `EmptyState` heading                           |
| **Stat Metric Value**                   | `font-heading text-2xl sm:text-3xl font-bold text-text`            | `StatCard` primary numbers                                     |
| **Body / Table Cell**                   | `text-sm text-text` (or `text-[15px] font-medium` on `MobileCard`) | General content, descriptions, table cells                     |
| **Form Label**                          | `text-sm font-semibold text-text`                                  | `FormInputField`, `FormSelectField` labels                     |
| **Helper / Secondary Copy**             | `text-xs text-muted` or `text-sm text-muted`                       | Descriptions, timestamps, `Dialog.Description`, `helperText`   |
| **Eyebrow / Table Header / Stat Label** | `text-xs font-semibold uppercase tracking-wide text-muted`         | `ListTableHeaderRow`, `StatCard` title, `StepIndicator` header |
| **Monospace Identifier**                | `font-mono text-xs` or `isMono` on `MobileCardContentItem`         | Member IDs, slugs, RFID tags                                   |

### 3.4 Kiosk & Registration Wizard Scale (`.wizard-step`)

Defined in [`src/App.css`](src/App.css) for high-visibility kiosk and registration flows:

- Container padding: `1.75rem`
- Step title (`.step-card__title`): `1.5rem`, `line-height: 1.2`
- Field input (`.registration-field-input`): `padding: 0.75rem 1rem`, `font-size: 1.125rem`
- Labels, copy, alerts, and errors: `1rem` (`16px`+)

---

## 4. Layout, Spacing, Radius, Elevation & Motion

### 4.1 Breakpoints & Viewport Switching

- `xs`: `480px` (custom breakpoint in `tailwind.config.js`)
- Standard Tailwind breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`
- **Mobile vs. Desktop Switch (`useIsMobileViewport`):** Switches at `< 768px` (below `md`). Admin data views use this hook to render `MobileCard` lists on mobile and `ListTable` on desktop.

### 4.2 Container Widths & Page Rhythm

- **App Shell Main Container:** `mx-auto w-full max-w-7xl flex-1 px-4 md:px-6 py-4`
- **Admin Page Shell:** `max-w-7xl` by default, or `max-w-screen-2xl` when `wide={true}` is passed; vertical rhythm is `space-y-6` (`space-y-4` on minimized shell routes).

### 4.3 Border Radius Scale

| Radius   | Token          | Usage                                                                                 |
| :------- | :------------- | :------------------------------------------------------------------------------------ |
| `6px`    | `rounded-md`   | Buttons, text inputs, selects, dropdown menus, skeletons                              |
| `8px`    | `rounded-lg`   | Icon badges inside `StatCard`, `ButtonGroup` (`xs`/`sm`), `EmptyState`                |
| `12px`   | `rounded-xl`   | `AlertBanner`, `StepIndicator`, `ButtonGroup` (`md`), `MobileCardActionPill`          |
| `16px`   | `rounded-2xl`  | `SectionCard`, `StatCard`, `MobileCard`, `Dialog`, `AdminPageShell.Filters`           |
| `9999px` | `rounded-full` | `Badge`, `Avatar`, `TabsList` track & `TabsTrigger` pills, `Switch`, `DayPicker` days |

### 4.4 Elevation & Shadows

Defined in `tailwind.config.js`:

| Token         | Value                                      | Usage                                                                                       |
| :------------ | :----------------------------------------- | :------------------------------------------------------------------------------------------ |
| `shadow-xs`   | `0 2px 4px rgba(0, 0, 0, 0.08)`            | `StatCard`, `StepIndicator`, `TabsList`, active `ButtonGroup.Item`, `primaryOutline` button |
| `shadow-sm`   | `0 4px 6px rgba(0, 0, 0, 0.1)`             | `SectionCard`, `MobileCard`, `Switch` thumb                                                 |
| `shadow-md`   | `0 10px 15px rgba(0, 0, 0, 0.1)`           | Button hover elevation                                                                      |
| `shadow-lg`   | `0 15px 30px rgba(0, 0, 0, 0.12)`          | Dropdown `listbox` panels, focused input glow                                               |
| `shadow-xl`   | `0 20px 50px rgba(11, 95, 255, 0.15)`      | `Dialog` modal surfaces                                                                     |
| `shadow-card` | `0 10px 30px -12px rgba(11, 95, 255, 0.2)` | Featured / elevated hero cards                                                              |

### 4.5 Motion & Animations

- **Entrance & Micro-Interactions (`tailwind.config.js`):**
  - `animate-fadeIn` (`300ms ease-out`) — applied to `<main>` route transitions in `AppShell`.
  - `animate-slideUp` (`400ms ease-out`, `translateY(20px) → 0`) — subtle upward reveals.
  - `animate-scaleIn` (`250ms ease-out`, `scale(0.95) → 1`) — pop-in surfaces.
  - `animate-pulse-soft` (`2s ease-in-out infinite`, opacity `1 → 0.8 → 1`) — gentle live indicators.
  - **Button press feedback:** `hover:scale-[1.02] active:scale-95` (disabled on `ghost` and `link`).
- **Custom CSS Animations (`src/index.css`):**
  - `.skeleton-shimmer` — `1.2s` linear gradient sweep over `#c9d4e1`.
  - `.notification-bell` — `0.8s` bell swing on hover/active or `.is-ringing` (respects `@media (prefers-reduced-motion: reduce)`).
  - `.animate-toast-progress` — linear countdown bar (`--toast-duration`, pauses on hover).

---

## 5. Layout Architecture

### 5.1 Application Shell (`AppShell`)

All standard routes render inside [`AppShell`](src/components/layout/AppShell.tsx):

- **`AppShellHeader`:** Brand identity, slide-out drawer trigger, `NotificationBell` (for authenticated sessions), and `UserIdentity` badge. Supports a compact `isMinimizedShell` mode for focused/kiosk routes.
- **`AppDrawerNavigation`:** Role- and permission-aware navigation drawer.
- **`<main>`:** Centered `max-w-7xl` content area with `animate-fadeIn`.
- **Global Prompts & Footer:** `PWAInstallPromptBanner`, `PushNotificationPromptBanner`, and `AppFooter`.

### 5.2 Admin Page Shell (`AdminPageShell`)

Every admin listing, dashboard, or management view **must** use [`AdminPageShell`](src/components/layout/AdminPageShell.tsx) with its compound subcomponents:

```tsx
import { AdminBaseNavigation } from '@/components/layout/AdminBaseNavigation';
import { AdminPageShell, AdminSubNavLink } from '@/components/layout/AdminPageShell';
import { Button, ButtonGroup, SearchInputField } from '@/components/ui';

export function AdminFeaturePage() {
  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Feature' }]}
        title="Feature Management"
        description="Concise summary of what administrators manage here."
        actions={<Button>Create New</Button>}
        navLinks={<AdminBaseNavigation />}
      />

      <AdminPageShell.Filters>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ButtonGroup value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <SearchInputField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder="Search items..."
            className="w-full sm:w-72"
          />
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading records...">
        {/* Desktop ListTable or MobileCard list */}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
```

### 5.3 Responsive Data Lists (`ListTable` vs. `MobileCard`)

Admin data lists switch cleanly at `768px` via `useIsMobileViewport()`:

```tsx
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  MobileCard,
  MobileCardActions,
  MobileCardActionButton,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import { useIsMobileViewport } from '@/hooks/utils';

const isMobile = useIsMobileViewport();

return isMobile ? (
  <div className="space-y-3">
    {items.map((item) => (
      <MobileCard key={item.id}>
        <MobileCardBody>
          <MobileCardHeader>...</MobileCardHeader>
          <MobileCardDivider />
          <MobileCardContent>
            <MobileCardContentItem label="Email" value={item.email} colSpan={2} isBreakAll />
            <MobileCardContentItem label="Member ID" value={item.memberId} isMono />
          </MobileCardContent>
        </MobileCardBody>
        <MobileCardActions>
          <MobileCardActionButton variant="outline">View</MobileCardActionButton>
        </MobileCardActions>
      </MobileCard>
    ))}
  </div>
) : (
  <ListTable>
    <ListTableHead>
      <ListTableHeaderRow>
        <ListTableHeaderCell>Member</ListTableHeaderCell>
        <ListTableHeaderCell>Status</ListTableHeaderCell>
      </ListTableHeaderRow>
    </ListTableHead>
    <ListTableBody>
      {items.map((item) => (
        <ListTableRow key={item.id}>
          <ListTableCell>...</ListTableCell>
          <ListTableCell>...</ListTableCell>
        </ListTableRow>
      ))}
    </ListTableBody>
  </ListTable>
);
```

- `ListTable` supports `density="default" | "dense"`, `ListTableHeaderRow` supports `variant="default" | "muted" | "plain"`, and `SortableTableHeaderCell` provides accessible ascending/descending sort toggles.
- Paginated admin lists use `useInfiniteScrollTrigger` paired with `AdminInfiniteScrollFooter`.

---

## 6. Core UI Component Catalog

All shared primitives are exported from `@/components/ui` (`src/components/ui/index.ts`).

### 6.1 Buttons & Selection Controls

#### `Button` ([`Button.tsx`](src/components/ui/Button.tsx))

- **Variants:** `default` (primary solid), `secondary`, `accent`, `outline`, `primaryOutline`, `ghost`, `link`, `destructive`.
- **Sizes:** `xs` (`min-h-8`), `sm` (`min-h-10`), `md` (`min-h-11`, default), `lg` (`min-h-12`), `xl` (`min-h-14`), `2xl` (`min-h-16`), `3xl` (`min-h-18`).
- **Props:** `fullWidth`, `fullWidthMobile` (`w-full sm:w-auto`), `asChild` (merges styles onto `<Link>` or child element), defaults `type="button"`.

#### `ButtonGroup` ([`ButtonGroup.tsx`](src/components/ui/ButtonGroup.tsx))

Segmented filter control for status switches (e.g., `All`, `Pending`, `Approved`, `Declined`).

- **Sizes:** `xs`, `sm` (default), `md`.
- Supports declarative `options` prop or compound `<ButtonGroup.Item value="...">` children. Selected item renders `bg-primary text-white shadow-xs font-bold`.

#### `Tabs` ([`Tabs.tsx`](src/components/ui/Tabs.tsx))

Custom accessible pill tabs (no external headless UI library).

- Compound parts: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- `TabsList` renders a centered `rounded-full border border-border bg-surface p-1 shadow-xs` track with automatic horizontal overflow detection, floating left/right scroll chevrons, auto-centering of the active tab, and full keyboard navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`).

#### `Switch` ([`Switch.tsx`](src/components/ui/Switch.tsx))

Accessible `role="switch"` toggle.

- **Variants:** `primary` (default), `success`.
- **Sizes:** `sm`, `md` (default).
- Optional `showStateText` with customizable `onText` / `offText` (defaults `'YES'` / `'NO'`).

### 6.2 Form Primitives

All forms use **React Hook Form + Zod** (`@hookform/resolvers/zod`) and pass `label="..."` directly into the shared primitives:

- **`FormInputField`** ([`FormInputField.tsx`](src/components/ui/FormInputField.tsx)): Supports RHF `registration` or controlled `value`/`onChange`, `required` red asterisk, `helperText`, `error`, `labelAdornment`, and automatic `min-w-0 appearance-none` on `type="date"` to prevent iOS Safari overflow.
- **`FormSelectField`** ([`FormSelectField.tsx`](src/components/ui/FormSelectField.tsx)): Custom accessible `role="listbox"` dropdown with smart upward/downward placement (`useDropdownPlacement`), type-ahead keyboard selection, optional `searchable` filter input, and `isGroupHeader` support.
  - **Placeholder Discipline:** Defaults to `placeholder="Select..."`. When a required dropdown has a valid initial default value, always pass `placeholder=""` so users cannot accidentally clear required state.
- **`SearchInputField`** ([`SearchInputField.tsx`](src/components/ui/SearchInputField.tsx)): Standardized search input with leading `Search` icon and conditional clear (`X`) button when `onClear` is provided.
- **`FormTextareaField`**, **`FormMultiSelectDropdownField`**, **`FormMarkdownField`**, **`CheckboxField`**, **`SlugField`**, **`SundayCalendarPicker`**, **`SundayDateTimePicker`**.
- **`FormErrorSummary`** ([`FormErrorSummary.tsx`](src/components/ui/FormErrorSummary.tsx)): Placed directly above bottom submit CTAs; wraps `AlertBanner variant="error"` with `aria-live="polite"` and a 1-click **"Jump to first error"** button.

### 6.3 Identity & Status Indicators

#### `Avatar` ([`Avatar.tsx`](src/components/ui/Avatar.tsx))

**Always** render `Avatar` when displaying users, members, volunteers, requesters, or attendees in tables, cards, dialogs, or drawers.

- **Sizes:** `xs` (`24px`), `sm` (`40px`), `md` (`64px`, default), `lg` (`128px`), `xl` (`192px`), `2xl` (`256px`), `3xl` (`512px`).
- **Border Rings:** `none`, `primary`, `secondary`, `destructive`, `accent`, `success`.
- Automatically loads transformed storage images via `useMemberAvatarQuery` with graceful fallback to deterministic color-coded 2-letter initials.

```tsx
<Avatar
  avatarObjectKey={member.avatar_object_key}
  name={member.full_name}
  size="sm"
  className="ring-1 ring-border"
/>
```

#### `Badge` & `StatusBadge` ([`Badge.tsx`](src/components/ui/Badge.tsx), [`StatusBadge.tsx`](src/components/ui/StatusBadge.tsx))

Pill-shaped status chips (`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap`) with optional `icon` slot:

| Variant          | Semantic Meaning                                                                  |
| :--------------- | :-------------------------------------------------------------------------------- |
| `default`        | Active, Open, Published, Committed (`bg-primary text-white`)                      |
| `secondary`      | Pending, Upcoming, Unscheduled, Walk-in (`bg-secondary text-white`)               |
| `tertiary`       | Specialty / Category tag (`bg-tertiary text-white`)                               |
| `accent`         | Excused, Highlighted (`bg-accent text-text`)                                      |
| `outline`        | Draft, Closed, Past, Neutral info (`border border-primary/60`)                    |
| `primaryOutline` | Updated / Emphasized outline (`border border-primary bg-background text-primary`) |
| `destructive`    | Error, Archived, Cancelled, Missed (`bg-red-600/50 text-text`)                    |

Prefer domain wrappers where applicable: `LifecycleStatusBadge` (`draft` / `published` / `archived`), `RegistrationStatusBadge` (`submitted` / `updated` / `cancelled`), and `MemberStatusBadge` (`Active` / `Inactive`).

### 6.4 Cards, Metrics, Feedback & States

- **`SectionCard`** ([`SectionCard.tsx`](src/components/ui/SectionCard.tsx)): Standard content surface (`rounded-2xl border border-border bg-surface p-6 shadow-sm`) with optional `title`, `subtitle`, and right-aligned `headerAction`.
- **`StatCard`** ([`StatCard.tsx`](src/components/ui/StatCard.tsx)): KPI metric card (`rounded-2xl border border-border bg-surface p-4 shadow-xs`) with uppercase muted title, tinted icon chip (`default`, `primary`, `secondary`, `tertiary`, `danger`, `accent`), bold metric value, and optional subtitle.
- **`AlertBanner`** ([`AlertBanner.tsx`](src/components/ui/AlertBanner.tsx)): Responsive `role="alert"` banner (`flex-col sm:flex-row`) with `info`, `warning`, `error`, and `success` variants. Action buttons stretch full-width on mobile and auto-width on desktop.
- **`EmptyState`** ([`EmptyState.tsx`](src/components/ui/EmptyState.tsx)): Centered `rounded-lg border border-border bg-background/50 py-16` block with `h-16 w-16` primary-tinted icon circle, title, description, and optional CTA.
- **`LoadingState`** ([`LoadingState.tsx`](src/components/ui/LoadingState.tsx)) & **`Skeleton`** ([`Skeleton.tsx`](src/components/ui/Skeleton.tsx)): `LoadingState` renders a `role="status"` vertical or horizontal `Spinner` with message; `Skeleton` renders `.skeleton-shimmer` blocks for slow-network placeholders.
- **`StepIndicator`** ([`StepIndicator.tsx`](src/components/ui/StepIndicator.tsx)): Numbered multi-step progress bar (`bg-primary` active, `bg-secondary` completed, `bg-surface border-border` upcoming).
- **Toast Notifications:** Managed globally via `sonner` (`<Toaster />` in `src/App.tsx`) with custom `NotificationPromptToast` progress bar styling.
- **Share as Image:** Use the `ImageCanvas` compound component (`<ImageCanvas.Provider>`, `<ImageCanvas>`, `<ImageCanvas.Actions>`, `<ImageCanvas.CancelButton>`) or `useImageCanvasGroup` from `@/components/ui` — never call `html-to-image` or `navigator.share` directly in dialogs.

### 6.5 Dialogs & Modals (`Dialog`)

Composed with the compound component pattern in [`Dialog.tsx`](src/components/ui/Dialog.tsx):

```tsx
<Dialog isOpen={isOpen} onClose={handleClose} size="lg">
  <Dialog.Header showCloseButton>
    <Dialog.Title>Edit Details</Dialog.Title>
    <Dialog.Description>Update the record and save your changes.</Dialog.Description>
  </Dialog.Header>

  <Dialog.Body>{/* Primary inputs first, secondary dropdowns below */}</Dialog.Body>

  <Dialog.Footer>
    <Button variant="outline" onClick={handleClose}>
      Cancel
    </Button>
    <Button onClick={handleSave}>Save Changes</Button>
  </Dialog.Footer>
</Dialog>
```

- **Sizes:** `sm`, `md`, `lg` (default), `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl`, `7xl`, `full`.
- Renders into `document.body` via `createPortal` with `bg-black/40` backdrop, Escape-to-close, and automatic body scroll lock.
- For simple destructive or confirmation prompts, use `ConfirmDialog` or `ActionConfirmButton`.

---

## 7. Interaction, Ergonomics & Domain UI Rules

### 7.1 Dialog & Modal Ergonomics

1. **No Blind `overflow-y-auto` on `Dialog.Body`:** The root `Dialog` overlay already handles smooth page-level scrolling. Adding `overflow-y-auto` or fixed `max-h` to `Dialog.Body` when content fits naturally causes double scrollbars and clips floating `FormSelectField` menus.
2. **Colocate Scrolling to Inner Dynamic Lists:** For long variable lists inside a modal (e.g., questions, attendees, search results), keep `Dialog.Body` natural and scroll only the list container (`max-h-[50vh] space-y-2.5 overflow-y-auto pr-1`) so headers and footers remain visible.
3. **Prevent Dropdown Occlusion:** Order modal forms with primary content inputs (e.g., textareas) first and secondary dropdowns/settings below them. Always pass `textareaClassName="resize-none"` on textareas inside dialogs.
4. **Full-Width Mobile Footer Actions:** Place footer buttons as **direct children** (or inside a React fragment `<>...</>`) of `Dialog.Footer` without extra wrapper `<div>`s. `Dialog.Footer` automatically applies `flex-col-reverse sm:flex-row [&>button]:w-full sm:[&>button]:w-auto`.

### 7.2 Domain Copy & Label Discipline

- **Never Invent UI Copy or Option Labels:** Always inspect existing domain pages, components, and schemas to mirror established terminology and casing (e.g., Forms `Audience`: `'Members and Public'`, `'Members Only'`, `'Public Only'`; Events `Allow Public Registrations`: `'Members + Public'`, `'Members'`, `'Public'`).
- **Use Component `label` Props:** Pass `label="..."` directly to `FormInputField`, `FormSelectField`, and `FormTextareaField` rather than detaching inputs from custom uppercase `<label>` tags.

### 7.3 Stepper Pills & Horizontal Scroll Tracks

- Active stepper navigation pills must use solid semantic theme tokens (`border-primary bg-surface text-primary font-semibold`) without Tailwind opacity modifiers (`/80`, `/10`) so 2px borders render cleanly without clipping.
- Horizontal scroll tracks must include vertical breathing room (`py-1.5`) and sanitized focus styles (`outline-none` paired with `focus-visible:ring-2 focus-visible:ring-primary`) so focus rings are never clipped.

### 7.4 Third-Party Widget Theme Integration (`src/index.css`)

- **React DayPicker (`.rdp-root`):** Themed to `--color-primary`, `--color-text`, `--color-muted`, and `--font-app` with pill day buttons (`rounded-full`) and solid primary selected state.
- **EasyMDE Markdown Editor:** Styled to sit cleanly below the sticky app header (`top: 5.5rem`, `z-index: 35`) in fullscreen and side-by-side preview modes.
- **Icons:** Standardized on [`lucide-react`](https://lucide.dev/). Keep icon sizes consistent (`h-3 w-3` / `h-3.5 w-3.5` in badges & sort headers, `h-4 w-4` in buttons & inputs, `h-5 w-5` in alerts).

---

## 8. Accessibility & Print Styles

### 8.1 Accessibility Standards

- **Focus Indicators:** Never use `focus:outline-none` without a visible replacement. Standard focus ring: `focus-visible:ring-2 focus-visible:ring-primary/50` (inputs use `focus:border-primary focus:ring-2 focus:ring-primary/30`).
- **Semantic HTML:** Use `<button>`, `<a>`, `<nav>`, `<main>`, `<article>`, and `<dl>`/`<dt>`/`<dd>` instead of attaching `onClick` handlers to `<div>` elements.
- **Explicit Button Types:** Always set `type="button"` on non-submit buttons (icon buttons, tab triggers, modal close triggers) so they never trigger accidental form submissions.
- **ARIA & Screen Readers:**
  - `Dialog`: `role="dialog" | "alertdialog"`, `aria-modal="true"`, auto-wired `aria-labelledby` and `aria-describedby`.
  - `AlertBanner`: `role="alert"`; `FormErrorSummary`: `aria-live="polite"`; `LoadingState`: `role="status"` with `sr-only` fallback.
  - Decorative icons carry `aria-hidden="true"`; icon-only buttons require `aria-label`.
- **External Link Security:** Any external anchor (including `ReactMarkdown` links) must include `target="_blank" rel="noopener noreferrer"`.

### 8.2 Print Styles (`@media print`)

Configured in [`src/index.css`](src/index.css) (`@page { margin: 12mm; }`):

- Strips background gradients, shadows, filters, and backdrops; forces white page background (`#fff`).
- Hides navigation drawers, headers, filter bars, and sub-navs (`print:hidden`).
- Prevents mid-row splits in `ListTable` (`print:[break-inside:avoid]`).
- Preserves intentional color chips via `.print-color-swatch` (`print-color-adjust: exact`).

---

## 9. Quick Reference: Do's & Don'ts

| Do                                                                                                                     | Don't                                                                                                               |
| :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| Use semantic tokens (`bg-surface`, `bg-background`, `text-text`, `text-muted`, `border-border`, `bg-primary`).         | Use `dark:*` Tailwind modifiers or hardcoded `gray-*`/`neutral-*` for page surfaces and text.                       |
| Compose admin pages with `AdminPageShell`, `ListTable` (desktop), and `MobileCard` (mobile via `useIsMobileViewport`). | Build custom ad-hoc table wrappers or hide mobile layouts with fragile CSS-only hacks.                              |
| Include `<Avatar avatarObjectKey={...} name={...} />` wherever a person is listed.                                     | Render plain text names without avatars in member, volunteer, or attendee lists.                                    |
| Use `Badge` / `StatusBadge` variants for status chips and `ButtonGroup` / `Tabs` for filter switches.                  | Hand-roll arbitrary colored `<div>` pills or install external headless UI libraries for simple tabs.                |
| Keep `Dialog.Body` natural and put `overflow-y-auto` only on inner dynamic lists.                                      | Wrap `Dialog.Body` in fixed `max-h` + `overflow-y-auto` that clips `FormSelectField` dropdowns.                     |
| Place `Dialog.Footer` buttons as direct children (or in `<>...</>`) and order primary inputs above dropdowns.          | Wrap footer buttons in extra `<div>`s (breaks mobile full-width stacking) or put dropdowns above primary textareas. |
| Pass `label="..."` to `FormInputField` / `FormSelectField` and `placeholder=""` on required selects with defaults.     | Invent new domain labels/options or detach raw `<label>` elements from shared form primitives.                      |
| Add `min-w-0 appearance-none` on native `<input type="date">` (handled automatically by `FormInputField`).             | Leave native date inputs unguarded against iOS Safari horizontal overflow.                                          |
