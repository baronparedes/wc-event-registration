## 2024-05-20 - Centralized DOMPurify Configuration

**Vulnerability:** Reverse Tabnabbing (XSS/Phishing) due to `target="_blank"` links lacking `rel="noopener noreferrer"` in user-generated HTML sanitized by `DOMPurify`.
**Learning:** Applying a security hook to a global library like `DOMPurify` multiple times inside individual component files creates redundant execution overhead and risks missing coverage if the component isn't loaded first.
**Prevention:** Create a centralized configuration file (e.g., `src/lib/infrastructure/dompurify.ts`), configure the library instance once, and export it for use across the application. Update all imports to use the secure, internal instance.

## 2024-05-20 - Markdown Reverse Tabnabbing & Secure Randomness

**Vulnerability:** Reverse Tabnabbing via unprotected `a` tags in Markdown rendered by `ReactMarkdown`, and insecure randomness from `Math.random()` used for IDs/slugs.
**Learning:** Even though `DOMPurify` is configured centrally, raw Markdown rendering components like `ReactMarkdown` can still emit unsafe links if not explicitly configured with custom components. Also, `Math.random()` is predictable and unsuitable for identifiers.
**Prevention:** Always provide custom renderer components for `a` tags in Markdown libraries to enforce `rel="noopener noreferrer"` on external links. Prefer `crypto.randomUUID()` or `crypto.getRandomValues()` for all randomness and ID generation.
