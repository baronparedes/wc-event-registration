## 2025-02-21 - Explicit XSS Protection in ReactMarkdown

**Vulnerability:** Potential XSS via malicious links (e.g., `javascript:alert(1)`) if `urlTransform` defaults are accidentally overridden or explicitly removed.
**Learning:** While `react-markdown` applies `defaultUrlTransform` internally by default to strip unsafe protocols, explicitly defining `urlTransform={defaultUrlTransform}` provides defense-in-depth and prevents future regressions if configuration defaults change or are unknowingly merged incorrectly.
**Prevention:** Always explicitly pass `urlTransform={defaultUrlTransform}` alongside `remarkPlugins` and `components` when configuring `ReactMarkdown` instances across the application.
