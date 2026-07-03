---
name: react-best-practices
description: 'React best practices audit and guidance. Use when: reviewing React components, writing hooks, managing state, handling forms, optimizing performance, fixing lint warnings, structuring components, or asking how to do something the "React way". Covers: component design, hooks rules, state management, form patterns, performance, accessibility, and common anti-patterns.'
argument-hint: 'Optional: describe the component or concern to focus on'
---

# React Best Practices

A structured guide for writing idiomatic, maintainable React code. Apply these practices when reviewing, writing, or refactoring components and hooks.

---

## When to Use This Skill

- Reviewing a component for correctness or clarity
- Writing a new hook or component from scratch
- Fixing ESLint/React compiler warnings
- Evaluating state shape or data flow
- Auditing form handling
- Improving component performance
- Checking accessibility compliance

---

## Procedure

### 1. Understand the Component's Responsibility

Before writing or reviewing, identify:

- **What does it render?** (pure UI, data-driven, page orchestrator)
- **What state does it own?** (server state, local UI state, form state)
- **What side effects does it have?** (data fetching, subscriptions, timers)

Use this to determine if the component is doing too much. If it renders, fetches, and manages multi-step logic — split it.

---

### 2. Apply Component Design Rules

See [component-design.md](./references/component-design.md) for full details.

**Key rules:**

- One component = one UI concern.
- Pages orchestrate; components render.
- Extract complex JSX (>~30 lines of repeated structure) into named components.
- Prefer composition (`children`, slot props) over prop drilling or branching-heavy components.
- Use `condition && <Component />` for single-branch render; ternary only when both branches render something.
- Avoid spreading props broadly (`{...props}`); be explicit.

---

### 3. Follow Hook Rules

See [hooks-rules.md](./references/hooks-rules.md) for full details.

**Key rules:**

- Hooks must be called unconditionally and at the top level — before any early return.
- Never call a hook inside a loop, conditional, or nested function.
- Do not mirror props or derived values into state with `useEffect` to "sync" them — derive at render time instead.
- Do not call `setState` synchronously inside effects unless syncing with an external system.
- Capture timer handles and subscriptions in local effect variables; clean up the local reference, not a mutable ref.

---

### 4. Manage State Correctly

See [state-management.md](./references/state-management.md) for full details.

**Rules by state type:**

| State Type                | Tool                                              |
| ------------------------- | ------------------------------------------------- |
| Form fields and values    | React Hook Form (`register`, `watch`, `useWatch`) |
| Server / async data       | React Query (`useQuery`, `useMutation`)           |
| Transient UI state        | `useState` (open/close, step, selected tab)       |
| Derived / computed values | `useMemo` or inline derivation during render      |
| Shared global UI state    | React context (sparingly)                         |

**Anti-patterns to reject:**

- `useState` for form field values (use RHF instead).
- `useEffect` to compute derived state (use `useMemo` or derive inline).
- Storing server response in local `useState` when React Query already holds it.
- Duplicated state that can be computed from other state.

---

### 5. Handle Forms with React Hook Form

See [forms.md](./references/forms.md) for full details.

**Mandatory pattern:**

```
1. Define Zod schema
2. Infer type with z.infer<typeof schema>
3. useForm({ resolver: zodResolver(schema), defaultValues })
4. Pass register() to field primitives
5. Extract formState once at top level
```

**Key rules:**

- Never use `useState` for form field values.
- Prefer `useWatch()` over `watch()` for scoped subscriptions to avoid render loops.
- Use `reset(data)` to load edit-mode values and track dirty state via `isDirty`.
- Disable save when `!isDirty` in edit mode to prevent unnecessary saves.
- Validate with Zod `superRefine` for cross-field rules — do not add manual validation in the component.

---

### 6. Write Effects Carefully

**Only use `useEffect` for:**

- Syncing with an external system (DOM API, timers, subscriptions, third-party libraries).
- Running a side effect after a render that cannot be expressed declaratively.

**Do NOT use `useEffect` for:**

- Computing derived state from props or other state.
- Triggering a state update that mirrors a prop.
- Data fetching (use React Query instead).

**Cleanup pattern:**

```ts
useEffect(() => {
  const id = setTimeout(() => doSomething(), delay)
  return () => clearTimeout(id) // capture local var, clean up local var
}, [delay])
```

---

### 7. Optimize Performance Intentionally

See [performance.md](./references/performance.md) for full details.

**Rules:**

- Do not memoize by default — only when profiling confirms a problem.
- Use `useMemo` for expensive computations that re-run on every render.
- Use `useCallback` only when passing stable callbacks to memoized child components.
- Use `React.memo` on components that receive stable props and re-render frequently.
- Prefer `useWatch()` over `watch()` to scope React Query / RHF subscriptions.
- Avoid anonymous objects/arrays in JSX props when they cause child re-renders.

---

### 8. Check Accessibility

**Baseline checklist:**

- Every input has a visible `<label>` (or `aria-label` if label is visually hidden).
- Interactive elements use semantic HTML: `<button>`, `<a>`, `<input>`, not `<div onClick>`.
- Focus states are visible — never remove `:focus` outline without a replacement.
- Icon-only elements have `aria-label` or companion visible text.
- Color alone is never the only indicator of state (use text or icon alongside color).
- Modals trap focus and restore it on close.

---

### 9. Review Common Anti-Patterns

See [anti-patterns.md](./references/anti-patterns.md) for the full catalog.

**Top offenders:**

- Prop drilling more than 2 levels → consider composition or context.
- Large components doing render + fetch + multi-step logic → split.
- `useEffect` chains that compute state → derive inline or use `useMemo`.
- Conditional hook calls → restructure to keep hooks unconditional.
- Missing cleanup in effects with timers/subscriptions → always return cleanup.
- Silently swallowing errors → surface user-safe messages, log details.

---

### 10. Audit Checklist

Run through this before marking a component ready:

- [ ] Component has a single UI responsibility
- [ ] No `useState` for form fields — using RHF
- [ ] No `useEffect` for derived/computed values
- [ ] All hooks called unconditionally, before any early return
- [ ] Effect cleanup captures and clears local handles
- [ ] No prop drilling beyond 2 levels
- [ ] Every input has a visible label
- [ ] Focus states not removed
- [ ] Loading, empty, and error states handled explicitly
- [ ] No `any` types; no unsafe casts
- [ ] `isDirty` used to gate save actions in edit mode
- [ ] `useWatch()` preferred over `watch()` for render subscriptions

---

## References

- [Component Design](./references/component-design.md)
- [Hooks Rules](./references/hooks-rules.md)
- [State Management](./references/state-management.md)
- [Forms (React Hook Form)](./references/forms.md)
- [Performance](./references/performance.md)
- [Anti-Patterns](./references/anti-patterns.md)
