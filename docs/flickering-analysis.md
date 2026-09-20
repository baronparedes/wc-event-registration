# Application Flickering Analysis

This document provides an in-depth analysis of why the application experiences excessive flickering, flashing components, and layout shifts during navigation and API requests. The issue primarily stems from a combination of aggressive React Suspense route boundaries, sub-optimal caching configurations, and nested loading states.

## 1. Route Transitions and Suspense Boundaries

### The Problem

The application uses React Router with lazy-loaded components (`React.lazy`) for all its pages to code-split the application. To handle the loading state of these chunks, a `LazyRoute` wrapper encapsulates every page component inside `src/app/router.tsx`:

```tsx
function RouteLoadingFallback() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-2/3" />
        ...
      </div>
    </section>
  );
}

function LazyRoute({ children }: { children: ReactElement }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>;
}
```

Every time a user navigates to a route that hasn't been downloaded yet, React mounts the `RouteLoadingFallback` component. Because this fallback is a generic skeleton, it aggressively replaces the current page's content, causing the screen to flash gray skeleton boxes before the actual page renders.

### Why it causes flickering

- **Loss of Context:** When navigating, the user loses the context of the previous page entirely. Instead of keeping the old page visible with a subtle loading indicator (like a top progress bar), the UI is aggressively blown away and replaced by generic skeletons.
- **Micro-flashes:** If the network is relatively fast (but not instantaneous), the `RouteLoadingFallback` mounts for just a few milliseconds. This creates an extremely jarring flash where a skeleton appears and disappears faster than the human eye can process smoothly.

### The Solution

- **Implement `useTransition` / `startTransition`:** By wrapping route navigation events in React's `startTransition`, React will keep the old UI on screen while it waits for the new route's code chunk and initial Suspense boundaries to resolve.
- **Use Data Routers:** Upgrading to React Router v6.4+ Data Routers (`createBrowserRouter`) allows the router to wait for lazy chunks and data to load before transitioning the UI.

## 2. React Query Caching Configuration

### The Problem

Throughout the application's domain hooks (`src/hooks/domain/`), many `useQuery` and `useInfiniteQuery` definitions use a `staleTime` of `0` (or `QUERY_STALE_TIME_MS.immediate`).
Examples:

- `useAdminMembersQuery`
- `useAdminEventsQuery`
- `useAdminFormsQuery`
- `useFormSubmissionsQuery`

When `staleTime` is `0`, React Query immediately marks the cached data as stale.

### Why it causes flickering

By default, React Query triggers a background refetch whenever a component mounts, the window regains focus, or network reconnects, if the data is stale. Because the data is _always_ stale:

1. Navigating to a page or tabbing back into the browser triggers a background fetch.
2. During this background fetch, the query's `isFetching` boolean evaluates to `true`.
3. In various parts of the app (like `ServiceAttendanceHistoryTab` or pagination controls), `isFetching` is tied to component opacity changes or disabling interactions. In some parent components, if they strictly evaluate `isLoading` instead of using the cached data while `isFetching`, they revert the UI back to skeleton loaders.

### The Solution

- **Increase `staleTime`:** For resources that don't need real-time exactness, increase the `staleTime` to a reasonable default (e.g., `5 * 60 * 1000` for 5 minutes). This prevents aggressive background refetching on mount and refocus.
- **Differentiate `isLoading` vs `isFetching`:** Ensure UI components only show full skeleton loaders on `isLoading` (which means there is _no_ data in the cache) and rely on subtle indicators (like opacity reduction or top loaders) for `isFetching` (which means data is updating in the background).

## 3. Authentication Check Double Loading (RequireAdminAuth)

### The Problem

The `RequireAdminAuth` component wraps all protected routes in `src/app/router.tsx`. It calls `useAdminAuthQuery` to fetch session details and role information. While this query is in the `isLoading` state, it returns a hardcoded skeleton fallback:

```tsx
function RequireAdminAuth({ ... }) {
  const { data, isLoading } = useAdminAuthQuery();
  // ...
  if (isLoading) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-4/5" />
        </div>
      </section>
    );
  }
  // ...
}
```

### Why it causes flickering

Because `RequireAdminAuth` is inside the `Routes` structure, and it renders _after_ the `LazyRoute` Suspense boundary resolves, it creates a **double layout shift**:

1. User navigates to `/admin/members`.
2. `LazyRoute` suspends while fetching the JS chunk, showing the `RouteLoadingFallback` skeleton.
3. The chunk loads, Suspense resolves, and `RequireAdminAuth` mounts.
4. `RequireAdminAuth` checks auth state, returning `isLoading: true`, which replaces the screen with a _different_ skeleton structure.
5. Auth resolves, and the actual page (`AdminMembersPage`) mounts.
6. The page might then execute its own data queries, potentially showing a _third_ loading state if its data isn't cached.

### The Solution

- **Hoist Auth Loading State:** The authentication state should ideally be resolved closer to the root of the app, or its loading state should match the application layout structure more seamlessly so it doesn't jarringly pop in.
- **Persist Global State:** Ensure the Supabase session is hydrated rapidly so `isLoading` evaluates as quickly as possible. If the auth state is known, avoid returning the `isLoading` skeleton entirely for fast transitions.

## Summary Recommendations

To eliminate the flickering, the architecture should be updated to:

1. Wrap routing events with `React.startTransition` or adopt a Data Router setup (e.g. `createBrowserRouter`) so the UI stays stable during JS chunk downloads.
2. Review and increase `staleTime` values in `QUERY_STALE_TIME_MS` and across domain queries to stop hyper-aggressive background refetching.
3. Unify loading states so `LazyRoute`, `RequireAdminAuth`, and page-level loaders do not sequentially replace each other during a single navigation action.
