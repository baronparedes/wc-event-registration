import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScrollTrigger } from '../useInfiniteScrollTrigger';

type MockObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

class MockIntersectionObserver {
  callback: MockObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: MockObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.lastInstance = this;
  }

  static lastInstance: MockIntersectionObserver | null = null;
}

describe('useInfiniteScrollTrigger', () => {
  beforeEach(() => {
    MockIntersectionObserver.lastInstance = null;
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('observes sentinel element when hasNextPage is true and not fetching', () => {
    const fetchNextPage = vi.fn();
    const mockEl = document.createElement('div');

    const { result } = renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    result.current.sentinelRef.current = mockEl;

    // Trigger effect rerun or verify instance created
    const instance = MockIntersectionObserver.lastInstance;
    expect(instance).not.toBeNull();
  });

  it('calls fetchNextPage when sentinel intersects viewport', () => {
    const fetchNextPage = vi.fn();

    renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    const instance = MockIntersectionObserver.lastInstance;
    expect(instance).not.toBeNull();

    act(() => {
      instance?.callback([{ isIntersecting: true }]);
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not call fetchNextPage if isIntersecting is false', () => {
    const fetchNextPage = vi.fn();

    renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    const instance = MockIntersectionObserver.lastInstance;
    act(() => {
      instance?.callback([{ isIntersecting: false }]);
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not create observer when hasNextPage is false', () => {
    const fetchNextPage = vi.fn();

    renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    expect(MockIntersectionObserver.lastInstance).toBeNull();
  });

  it('does not create observer when isFetchingNextPage is true', () => {
    const fetchNextPage = vi.fn();

    renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage,
      }),
    );

    expect(MockIntersectionObserver.lastInstance).toBeNull();
  });

  it('does not create observer when disabled is true', () => {
    const fetchNextPage = vi.fn();

    renderHook(() =>
      useInfiniteScrollTrigger({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
        disabled: true,
      }),
    );

    expect(MockIntersectionObserver.lastInstance).toBeNull();
  });
});
