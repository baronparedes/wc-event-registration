## 2024-10-24 - Edge Functions Internal Error Leakage

**Vulnerability:** Several Supabase Edge Functions (e.g., `member-lookup`, `send-app-notification`, `cron-tokenize-users`, `bulk-upsert-service-attendance`, `manage-push-subscription`, `list-unregistered-members`) were directly exposing internal `error.message` strings to the client in HTTP response bodies when exceptions were thrown.
**Learning:** Returning unhandled exception messages to the client can leak sensitive system internals (e.g., database schema details, API keys, file paths, or internal logic). This violates the "fail securely" principle.
**Prevention:** Always log detailed `error.message` internally via `console.error` for server-side debugging, and consistently return a generic, sanitized error message (e.g., "Internal server error") to the client using standardized error response helpers.
