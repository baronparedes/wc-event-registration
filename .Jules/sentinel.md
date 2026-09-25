## 2024-05-20 - Centralized DOMPurify Configuration

**Vulnerability:** Reverse Tabnabbing (XSS/Phishing) due to `target="_blank"` links lacking `rel="noopener noreferrer"` in user-generated HTML sanitized by `DOMPurify`.
**Learning:** Applying a security hook to a global library like `DOMPurify` multiple times inside individual component files creates redundant execution overhead and risks missing coverage if the component isn't loaded first.
**Prevention:** Create a centralized configuration file (e.g., `src/lib/infrastructure/dompurify.ts`), configure the library instance once, and export it for use across the application. Update all imports to use the secure, internal instance.
