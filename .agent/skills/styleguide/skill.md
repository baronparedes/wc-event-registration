---
name: styleguide
description: 'Frontend Style Guide enforcer. Use when: creating new UI components, styling with Tailwind CSS, writing form logic, managing React state, or refactoring frontend code. Covers: Tailwind utility usage, strict TypeScript patterns, component structure, state vs. derived state, accessibility, and form validation.'
argument-hint: 'Optional: describe the UI component or specific frontend logic being reviewed/written'
---

# Frontend Style Guide Skill

A specialized AI agent skill designed to enforce the WC Event Registration Platform's frontend conventions. Always refer to this skill before suggesting or implementing UI, state, styling, or form logic.

## 1. Component Architecture

- **Separation of Concerns:** Maintain a strict split between Orchestration (Pages) and Presentation (Components).
  - Pages handle data fetching (React Query), layout, routing, and loading/error states.
  - Components receive data via props and render UI.
- **Composition over Props:** Avoid prop explosion. Use `children` or slot props to compose complex UIs rather than passing countless configuration props.
- **Extraction Threshold:** If a JSX block exceeds ~30 lines of repeatable structure, extract it into a named component in the same file or a co-located file. Do not define components inside other components.
- **UI Primitives:** Always prioritize using existing shared primitives in `src/components/ui/` (e.g., `Button`, `Dialog`, `FormInputField`) instead of building custom one-off variants.
- **No External UI Libraries:** For simple interaction patterns (like Tabs), do not install external headless libraries. Build them using custom React state and standard HTML `<button>` elements styled with Tailwind.

## 2. Tailwind & Styling Rules

- **Theme Colors:** Restrict color usage to the CSS variables defined in `tailwind.config.js` (e.g., `text-primary`, `bg-surface`, `border-border`, `bg-accent`).
- **Class Merging:** Use utility functions (e.g., `cx`, `clsx`, `twMerge`) to safely compose dynamic classes.
- **Focus Outlines:** Never use `focus:outline-none` without providing an explicit replacement. The standard pattern is `focus-visible:ring-2 focus-visible:ring-primary/50`.
- **Responsive Gotchas:**
  - Standard Admin lists should use the `useIsMobileViewport` hook to conditionally render mobile card layouts versus desktop `ListTable` layouts.
  - Native `<input type="date">` elements must include `min-w-0 appearance-none` to prevent iOS Safari horizontal overflow bugs.

## 3. State & Hooks Rules

- **Derive Don't Sync:** Never use `useEffect` to mirror a prop into local state or compute a derived value. Derive the value directly during the render cycle. Use `useMemo` only if the operation is computationally heavy.
- **Server State:** Never mirror React Query responses into local `useState`. Consume the data directly from the query hook result.
- **Form State:** Never use `useState` for tracking form field inputs. Use React Hook Form (`register`, `useWatch`).
- **Effects & Cleanup:** Always ensure that `useEffect` hooks initializing timers, intervals, or event listeners return a cleanup function to prevent memory leaks.
- **State Initialization:** Avoid initializing `useState` directly with browser-only APIs (`window.innerWidth`, `matchMedia`) to prevent hydration mismatches; set a default value and update it within a `useEffect`.

## 4. TypeScript & Data Boundaries

- **Strict Typing:** No `any`. Explicitly type component props (`export type ButtonProps = ...`) and hook return signatures.
- **Zod Validation:** All data entering the frontend from external sources (APIs, Supabase RPCs) must be validated using Zod. Infer TypeScript interfaces directly from Zod schemas (`z.infer<typeof Schema>`).

## 5. Forms & Actions

- **RHF Standard:** All forms must use React Hook Form integrated with `@hookform/resolvers/zod`.
- **Validation Patterns:** Re-use standard regex patterns from `src/config/constants/validation.ts` for emails, slugs, and phone numbers.
- **Edit Mode Safety:** Leverage the `isDirty` flag from RHF's form state to disable save buttons when no edits have been made.
- **Button Types:** Always explicitly define `type="button"` on custom interactive elements (icon buttons, tab triggers) to prevent them from acting as implicit submit buttons within form contexts.

## 6. Accessibility & Security

- **Semantic Tags:** Use appropriate semantic HTML (`<button>`, `<a>`, `<dialog>`). Avoid attaching `onClick` handlers to `<div>` elements.
- **Link Security:** Any dynamically rendered anchor tags (such as those rendered via `ReactMarkdown`) that point to external URLs must inject `target="_blank"` and `rel="noopener noreferrer"`.
- **Notifications:** Use the global `sonner` toast system for all user feedback, ensuring backend validation errors are parsed nicely (e.g., via `parseErrorToJsonOrString`) before display.

---

**Execution Check:** Before finalizing a frontend code change, verify it passes all constraints in this document and aligns with the full `docs/STYLEGUIDE.md` specifications.
