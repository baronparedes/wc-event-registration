# Domain Hooks & Query Architecture

**Context:** This skill defines how React Query hooks and Supabase database interactions should be structured.

**Instructions:**

- **Location:** Domain hooks must reside directly in `src/hooks/domain/`.
- **Direct Execution:** Hooks should execute Supabase database operations directly inside the individual hook files.
- **No Intermediaries:** Do not create intermediate data abstraction files or utilize repository patterns to separate queries from hooks.
- **File Structure:** Each hook must be defined in its own independent file.
- **Admin Pagination:** Admin paginated data views (e.g., Events, Members, Member Registrations, Public Registrations) must use the `useInfiniteScrollTrigger` custom hook (`src/hooks/utils/useInfiniteScrollTrigger.ts`). This uses the `IntersectionObserver` API for infinite scroll pagination via React Query's `useInfiniteQuery`.
