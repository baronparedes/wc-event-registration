# TypeScript Standards & Validation

**Context:** This skill covers the strict typing and validation constraints required in this repository.

**Instructions:**

- **Strict Typing:** Do not use `any` types anywhere in the codebase.
- **No Linter Overrides:** Do not bypass linter rules using `@typescript-eslint/no-explicit-any` comments.
- **Prefer Schema Inference:** Always rely on strict TypeScript typing, schema inference (e.g., Zod schemas and `z.infer`), and generics to maintain type safety.
- **Date Handling:** Favor native JavaScript `Date` object manipulation for simple date logic (like calculating the start or end of a week) rather than introducing third-party dependencies like `date-fns`.
