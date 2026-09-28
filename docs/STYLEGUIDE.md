# Frontend Style Guide

This document outlines the coding standards, patterns, and conventions for the frontend codebase (React, TypeScript, Tailwind CSS) of the WC Event Registration Platform.

## 1. Tech Stack & Core Philosophy

- **Framework:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS, Radix primitives, custom shadcn-style UI components
- **Server State:** React Query
- **Form State:** React Hook Form + Zod validation
- **Routing:** React Router

**Core Philosophy:**
- **Separation of Concerns:** Pages orchestrate (fetch data, manage layout/routing), while components render UI.
- **Type Safety:** Strict TypeScript usage. No `any` types. External data must be validated at the boundary with Zod.
- **Derived State:** Prefer computing values during render over synchronizing state with `useEffect`.
- **Composition over Configuration:** Build UIs with component slots (`children`) rather than heavy branching via props.

---

## 2. Component Design & Structure

- **Single Responsibility:** Each component should have exactly one UI concern.
- **Extraction Rules:** Extract JSX chunks larger than ~30 lines with a repeatable shape into smaller, named components. Do not define nested components inside other components.
- **Conditional Rendering:**
  - Use `condition && <Component />` for single branches.
  - Use ternaries (`condition ? <TrueBranch /> : <FalseBranch />`) only if both branches render content.
- **Props:**
  - Keep prop lists explicit. Avoid broadly spreading props (`{...props}`) unless explicitly building a transparent wrapper primitive.
  - If a component requires 8+ props, consider splitting it or using composition (`children`).
- **Co-location:**
  - Route/page specific components: `src/pages/<page>/components/`
  - Global shared UI components: `src/components/ui/`
  - Layout components: `src/components/layout/`

---

## 3. TypeScript Conventions

- **Strict Types:** Always provide types. Never use `any` or bypass types with unsafe casts (`as Type`) without validation.
- **Data Boundaries:** When fetching external data (Supabase responses, API calls), validate the shape using Zod and infer the TypeScript type via `z.infer<typeof Schema>`.
- **Component Props:** Export the prop type for UI primitives (e.g., `export type ButtonProps = ...`).
- **Generic Hooks:** Apply proper generics to custom hooks (React Query, Zod resolvers) to ensure type flow throughout the app.

---

## 4. State Management & Hooks

- **Server State:** Use React Query (`useQuery`, `useMutation`). Do not duplicate React Query data into local `useState`. Read directly from the query hook result.
- **Local UI State:** Use `useState` exclusively for transient UI state (toggles, tabs, dialog open states).
- **Form State:** Never use `useState` for managing form input values. Always use React Hook Form (`register`, `useWatch`).
- **Derived State:** If a value can be computed from existing props or state, derive it during render. Use `useMemo` only if the computation is proven to be expensive. Never use `useEffect` to mirror a prop into state.
- **Hook Rules:**
  - One hook per file, located in `src/hooks/`.
  - Name hooks predictably: `useXQuery`, `useActionXMutation`, `useXState`.
  - Call hooks unconditionally at the top level.
  - Ensure all `useEffect` hooks with timers, listeners, or subscriptions return a cleanup function.

---

## 5. Styling & Tailwind CSS

- **Utility First:** Use Tailwind utility classes for all styling.
- **Custom Theme Colors:** Use the defined theme colors from `tailwind.config.js`:
  - `primary`, `secondary`, `accent`
  - `background`, `surface`
  - `text`, `muted`
  - `border`, `danger`
- **Class Concatenation:** Use utility functions (like `clsx` and `tailwind-merge`, or custom `cx`) to merge dynamic Tailwind classes safely.
- **Focus & Accessibility:**
  - Never remove focus outlines without providing a replacement.
  - When removing default focus (`focus:outline-none`), apply custom rings: `focus-visible:ring-2 focus-visible:ring-primary/50`.
- **Responsive Design:**
  - Admin tables: Use `useIsMobileViewport` to switch between desktop `ListTable` components and mobile card-based layouts.
  - Form Inputs: On iOS, native `<input type="date">` requires `min-w-0 appearance-none` to prevent horizontal layout overflow.
- **UI Components:** Do not use external headless UI libraries for simple components like tabs; implement them with custom React state and standard `<button>` elements styled with Tailwind.

---

## 6. Forms & Validation

- **Zod & React Hook Form:** All forms must use React Hook Form coupled with a Zod resolver.
- **Validation:** Validation schemas (regex rules for slugs, emails, phones) must utilize centralized constants (e.g., `VALIDATION_PATTERNS`).
- **Field Primitives:** Use the shared UI primitives (e.g., `FormInputField`) passing the `register()` call to standardize field layouts, labels, and error messages.
- **Edit Mode:** Track `isDirty` state from the form context to disable save actions if no changes have been made. Use `useWatch()` instead of `watch()` for scoped reactivity to avoid full form re-renders.

---

## 7. Interaction & Accessibility Best Practices

- **Buttons:** Always explicitly define `type="button"` on custom interactive elements (like icon buttons or custom tab triggers) to prevent unintended form submissions.
- **Links & Security:** External links rendered dynamically (e.g., in ReactMarkdown) must inject `target="_blank"` and `rel="noopener noreferrer"` to prevent Reverse Tabnabbing vulnerabilities.
- **Semantic HTML:** Use semantic tags (`<button>`, `<a>`, `<nav>`, `<main>`) instead of slapping `onClick` handlers on `<div>` elements.
- **Notifications:** Use the global `sonner` toast system for communicating success, error, or informational messages to the user.
