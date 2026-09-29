## 2026-09-26 - [Optimize inner loop sort dates]

**Learning:** Parsing dates with `new Date(ISO_String).getTime()` inside inner `.sort()` loops is expensive and causes unnecessary memory allocations.
**Action:** Use native string comparisons (e.g., `aTime < bTime ? -1 : 1`) on ISO-8601 strings since their lexical order perfectly matches chronological order.

## 2024-05-18 - Client-Side Array Sorting Object Allocation Overhead

**Learning:** In React components that handle rendering large lists (like Event Registrations), using `new Date(string).getTime()` directly inside `Array.prototype.sort()`'s comparison function callback causes significant performance issues due to excessive, rapid object allocation and garbage collection within the `O(N log N)` loop.
**Action:** Always prefer native string comparison (`a < b ? -1 : 1`) over parsing into `Date` objects when dealing with reliable, standard ISO-8601 formatted datetime strings, saving significant CPU cycles and memory.
