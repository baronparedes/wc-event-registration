# Testing with Vitest & React Testing Library

**Context:** This skill defines how tests should be written and configured.

**Instructions:**

- **Test Runner:** All unit tests are executed using Vitest via the `npm run test:unit` command.
- **Environment Setup:** Vitest requires Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`). Ensure these are defined in `.env.local` or explicitly exported in the test execution environment.
- **Component Interaction:** When unit testing custom components like the `FormSelectField` using React Testing Library, interact with the dropdown by locating the internal button trigger using the `aria-haspopup="listbox"` attribute.
- **Coverage Exclusions:** Remember that `supabase/functions/**` are excluded from Vitest test coverage reporting.
- **Test Data (Faker):** Never use real-looking person names or real email domains in tests.
  - Build objects with factories from `@/__tests__/factories` (add new factories there) or `@faker-js/faker` directly.
  - Emails: `faker.internet.exampleEmail()` or an `@example.com` address. Never `faker.internet.email()`.
  - Assert against generated values (`screen.getByText(member.full_name)`), not duplicated literals.
  - Literal names are allowed only when a test needs an exact string (formatting, sorting) and must start with `Test` or `Sample` (e.g. `'Test Member'`).
  - Faker is seeded once per test file in `vitest.setup.ts`. Reproduce or vary data with `FAKER_SEED=123 npm run test:unit`. Never call `faker.seed()` in tests.
  - Enforced by ESLint `no-restricted-syntax` on test files (person-name keys and `email` keys).
