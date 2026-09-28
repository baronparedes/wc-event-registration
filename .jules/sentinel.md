## 2026-09-26 - Centralized DOMPurify Configuration

**Vulnerability:** Reverse Tabnabbing (XSS/Phishing) due to `target="_blank"` links lacking `rel="noopener noreferrer"` in user-generated HTML sanitized by `DOMPurify`.
**Learning:** Applying a security hook to a global library like `DOMPurify` multiple times inside individual component files creates redundant execution overhead and risks missing coverage if the component isn't loaded first.
**Prevention:** Create a centralized configuration file (e.g., `src/lib/infrastructure/dompurify.ts`), configure the library instance once, and export it for use across the application. Update all imports to use the secure, internal instance.

## 2026-09-27 - Markdown Reverse Tabnabbing & Secure Randomness

**Vulnerability:** Reverse Tabnabbing via unprotected `a` tags in Markdown rendered by `ReactMarkdown`, and insecure randomness from `Math.random()` used for IDs/slugs.
**Learning:** Even though `DOMPurify` is configured centrally, raw Markdown rendering components like `ReactMarkdown` can still emit unsafe links if not explicitly configured with custom components. Also, `Math.random()` is predictable and unsuitable for identifiers.
**Prevention:** Always provide custom renderer components for `a` tags in Markdown libraries to enforce `rel="noopener noreferrer"` on external links. Prefer `crypto.randomUUID()` or `crypto.getRandomValues()` for all randomness and ID generation.

## 2026-09-29 - Edge Functions Internal Error Leakage

**Vulnerability:** Several Supabase Edge Functions (e.g., `member-lookup`, `send-app-notification`, `cron-tokenize-users`, `bulk-upsert-service-attendance`, `manage-push-subscription`, `list-unregistered-members`) were directly exposing internal `error.message` strings to the client in HTTP response bodies when exceptions were thrown.
**Learning:** Returning unhandled exception messages to the client can leak sensitive system internals (e.g., database schema details, API keys, file paths, or internal logic). This violates the "fail securely" principle.
**Prevention:** Always log detailed `error.message` internally via `console.error` for server-side debugging, and consistently return a generic, sanitized error message (e.g., "Internal server error") to the client using standardized error response helpers.
