# Edge Functions & Security Considerations

**Context:** This skill details how to write and secure Supabase Edge Functions in this repository.

**Instructions:**

- **Shared Hook:** Always use the `useEdgeHook` from `shared/edge.ts` for standardized CORS handling, authentication parsing, and Zod schema validation.
- **Internal Triggers Security:** For Edge Functions intended to be invoked by internal triggers (like `pg_net` or `pg_cron`), avoid setting `requireServiceRoleSession: true` in `useEdgeHook`, because database extensions cannot easily sign requests with auth tokens.
- **Database Layer Security:** Instead of relying on Edge Function auth headers for internal jobs, secure the underlying database RPC wrappers by explicitly revoking `EXECUTE` privileges from `PUBLIC`, `anon`, and `authenticated` roles, and granting `EXECUTE` only to the `service_role`.
- **Test Coverage Exclusions:** Supabase Edge Functions (`supabase/functions/**`) are intentionally excluded from Vitest test coverage reporting.
