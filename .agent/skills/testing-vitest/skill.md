# Testing with Vitest & React Testing Library

**Context:** This skill defines how tests should be written and configured.

**Instructions:**

- **Test Runner:** All unit tests are executed using Vitest via the `npm run test:unit` command.
- **Environment Setup:** Vitest requires Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`). Ensure these are defined in `.env.local` or explicitly exported in the test execution environment.
- **Component Interaction:** When unit testing custom components like the `FormSelectField` using React Testing Library, interact with the dropdown by locating the internal button trigger using the `aria-haspopup="listbox"` attribute.
- **Coverage Exclusions:** Remember that `supabase/functions/**` are excluded from Vitest test coverage reporting.
