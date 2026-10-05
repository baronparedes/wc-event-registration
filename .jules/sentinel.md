## 2025-02-21 - Explicit XSS Protection in ReactMarkdown

**Vulnerability:** Potential XSS via malicious links (e.g., `javascript:alert(1)`) if `urlTransform` defaults are accidentally overridden or explicitly removed.
**Learning:** While `react-markdown` applies `defaultUrlTransform` internally by default to strip unsafe protocols, explicitly defining `urlTransform={defaultUrlTransform}` provides defense-in-depth and prevents future regressions if configuration defaults change or are unknowingly merged incorrectly.
**Prevention:** Always explicitly pass `urlTransform={defaultUrlTransform}` alongside `remarkPlugins` and `components` when configuring `ReactMarkdown` instances across the application.

## 2025-02-23 - Prevent Sensitive Data Leakage in Supabase Edge Functions

**Vulnerability:** Leaking internal `error.message` (e.g. from database query errors) directly to the client in HTTP responses via the `errorResponse` function.
**Learning:** Returning raw database error messages or internal error details to the client exposes the database schema, query structures, or internal state, which malicious actors can use to further exploit the system.
**Prevention:** Always log the detailed error using `console.error` on the server and return a generic, user-safe error message (e.g., `'Internal server error'`) to the client.

## 2026-10-03 - Added Security Headers to Supabase Edge Functions

**Vulnerability:** Missing standard security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-XSS-Protection) in Edge Function responses.
**Learning:** By default, Supabase edge functions do not enforce these headers. A central place to manage these is required to prevent widespread vulnerability.
**Prevention:** Added standard security headers to `buildCorsHeaders` utility function inside `_shared/security.ts`, guaranteeing they are present across all standard API responses.

## 2025-02-14 - Replace Math.random with crypto.randomUUID for Secure Queue IDs

**Vulnerability:** Insecure randomness in queue ID generation (`generateQueueItemId`), using `Math.random` as a fallback.
**Learning:** `Math.random` generates predictable pseudorandom numbers, which can lead to predictability in queue IDs.
**Prevention:** Always use Cryptographically Secure Pseudorandom Number Generators (CSPRNG) like `crypto.randomUUID()` or `crypto.getRandomValues()` instead of `Math.random()`.
