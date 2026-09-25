import { useEffect, useRef } from 'react';

export interface UseInfiniteScrollTriggerOptions {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean | undefined;
  fetchNextPage: () => void | Promise<unknown>;
  rootMargin?: string;
  disabled?: boolean;
}

/**
 * Custom hook to attach an IntersectionObserver to a sentinel element for infinite scrolling.
 */
export function useInfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
  disabled = false,
}: UseInfiniteScrollTriggerOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin },
    );

    const currentElement = sentinelRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, disabled]);

  return { sentinelRef };
}
