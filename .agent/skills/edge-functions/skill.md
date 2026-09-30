# Edge Functions & Security Considerations

**Context:** This skill details how to write and secure Supabase Edge Functions in this repository.

**Instructions:**

- **Shared Hook:** Always use the `useEdgeHook` from `shared/edge.ts` for standardized CORS handling, authentication parsing, and Zod schema validation.
- **Internal Triggers Security:** For Edge Functions intended to be invoked by internal triggers (like `pg_net` or `pg_cron`), avoid setting `requireServiceRoleSession: true` in `useEdgeHook`, because database extensions cannot easily sign requests with auth tokens.
- **Database Layer Security:** Instead of relying on Edge Function auth headers for internal jobs, secure the underlying database RPC wrappers by explicitly revoking `EXECUTE` privileges from `PUBLIC`, `anon`, and `authenticated` roles, and granting `EXECUTE` only to the `service_role`.
- **Test Coverage Exclusions:** Supabase Edge Functions (`supabase/functions/**`) are intentionally excluded from Vitest test coverage reporting.
- **Tests Required:** Add or update Deno tests whenever an Edge Function is added or its behavior changes. Do not finish a behavior change without regression coverage for the changed behavior, including relevant success and rejection/error paths.
- **Test Location:** Put tests in `__tests__/*.test.ts` inside the function folder. Tests for shared modules go in `supabase/functions/_shared/__tests__/`. Import the source under test from the parent directory, such as `../handler.ts` or `../utils.ts`.
- **Test Layers:** Cover pure validation, mapping, and policy logic directly. Cover HTTP/auth/database interaction at the handler boundary when useful, preferring fetch-boundary mocks over custom mocks of Supabase's chained query API. Use local Supabase integration tests when correctness depends on actual RLS, RPC permissions, constraints, or migrations.
- **Validation:** Run the focused test directory with `deno test -A <function>/__tests__/` from `supabase/functions`, then type-check the function entry point. Run `npm run test:edge` after the slice is complete; run `npm run ci:edge` for final Edge CI validation when appropriate.
- **Detailed Guide:** Follow [`edge-function-testing`](../edge-function-testing/SKILL.md) for test design, fetch mocking, environment cleanup, and reporting coverage gaps.
