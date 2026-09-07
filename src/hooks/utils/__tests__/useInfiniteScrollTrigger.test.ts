import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScrollTrigger } from '../useInfiniteScrollTrigger';

describe('useInfiniteScrollTrigger', () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();

    class MockIntersectionObserver {
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('provides sentinel ref', () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    const div = document.createElement('div');
    result.current.current = div;

    expect(result.current.current).toBe(div);
  });

  it('does not observe when hasNextPage is false', () => {
    const fetchNextPage = vi.fn();
    renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    expect(mockObserve).not.toHaveBeenCalled();
  });
});
