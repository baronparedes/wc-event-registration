# Component Design

## Responsibilities

Each component should have exactly one UI concern. The most common split is:

| Type              | Responsibility                                                                 |
| ----------------- | ------------------------------------------------------------------------------ |
| **Page**          | Route-level composition, query coordination, loading/empty/error state         |
| **UI Component**  | Rendering and interaction only — no data fetching                              |
| **Action Dialog** | Owns local open/close state and trigger wiring; data-only prop API             |
| **Form Section**  | Composes shared field primitives; no form state ownership (page owns the form) |

## When to Extract

Extract a component when:

- A JSX block exceeds ~30 lines and has a clear, repeatable shape
- The same structure appears in 2+ places
- A block has its own distinct interaction or internal state
- Readability of the parent suffers from inlining it

## Composition Over Branching

Prefer composable components over prop-explosion or heavily branched components.

**Prefer:**

```tsx
<Card>
  <CardHeader>{title}</CardHeader>
  <CardBody>{children}</CardBody>
</Card>
```

**Avoid:**

```tsx
<Card title={title} showHeader={true} headerVariant="large" bodyContent={children} />
```

## Conditional Rendering

```tsx
// Single-branch: use &&
{
  isLoggedIn && <UserMenu />;
}

// Two-branch: use ternary only when both branches render something
{
  isLoading ? <Spinner /> : <Content />;
}

// Avoid: ternary where one side is null
{
  isLoggedIn ? <UserMenu /> : null;
} // ❌ use && instead
```

## Props

- Be explicit — avoid broad `{...props}` spreading.
- Keep prop lists short; if a component needs 8+ props, consider splitting it.
- Prefer data-only prop APIs for action dialogs: pass only row/entity data, not callbacks for open/close.
- Use `children` for flexible slot composition instead of `renderProp` patterns unless the child needs access to internal state.

## Co-location

- Page-specific components live in `src/pages/<page>/components/`.
- Shared cross-page components live in `src/components/`.
- Do not define reusable components inline inside page files — extract to their own file.
