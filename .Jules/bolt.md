## 2026-09-26 - [Optimize inner loop sort dates]

**Learning:** Parsing dates with `new Date(ISO_String).getTime()` inside inner `.sort()` loops is expensive and causes unnecessary memory allocations.
**Action:** Use native string comparisons (e.g., `aTime < bTime ? -1 : 1`) on ISO-8601 strings since their lexical order perfectly matches chronological order.
