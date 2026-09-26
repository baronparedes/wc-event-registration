# Domain Hooks & Query Architecture

**Context:** This skill defines how React Query hooks and Supabase database interactions should be structured.

**Instructions:**

- **Location:** Domain hooks must reside directly in `src/hooks/domain/`.
- **Repository Layer:** All Supabase database operations (`supabase.from`, `supabase.rpc`, `supabase.functions.invoke`) live in `src/lib/domain/<feature>/api.ts` as explicitly named, strongly typed async functions, re-exported from the feature's `index.ts` barrel.
- **Hooks Call the API:** `queryFn`/`mutationFn` call these API functions; hook files must not import `supabase` except for `supabase.auth` and `supabase.storage` operations.
- **No Hook-Level Abstractions:** Do not create data abstraction files inside `src/hooks/`; query keys, pagination (`decodeOffsetCursor`, `getTotalPages`), transforms, and invalidation stay in the hooks.
- **File Structure:** Each hook must be defined in its own independent file.
- **Admin Pagination:** Admin paginated data views (e.g., Events, Members, Member Registrations, Public Registrations) must use the `useInfiniteScrollTrigger` custom hook (`src/hooks/utils/useInfiniteScrollTrigger.ts`). This uses the `IntersectionObserver` API for infinite scroll pagination via React Query's `useInfiniteQuery`.
