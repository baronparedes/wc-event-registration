import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounceSearch } from '../useDebounceSearch';

describe('useDebounceSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty search terms by default', () => {
    const { result } = renderHook(() => useDebounceSearch());

    expect(result.current.searchTerm).toBe('');
    expect(result.current.debouncedSearchTerm).toBe('');
    expect(result.current.normalizedSearchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('accepts initialValue option', () => {
    const { result } = renderHook(() => useDebounceSearch({ initialValue: '  initial query  ' }));

    expect(result.current.searchTerm).toBe('  initial query  ');
    expect(result.current.debouncedSearchTerm).toBe('  initial query  ');
    expect(result.current.normalizedSearchTerm).toBe('initial query');
    expect(result.current.isSearching).toBe(true);
  });

  it('debounces searchTerm update by specified delayMs', () => {
    const { result } = renderHook(() => useDebounceSearch({ delayMs: 400 }));

    act(() => {
      result.current.setSearchTerm('hello world');
    });

    // Immediate state
    expect(result.current.searchTerm).toBe('hello world');
    expect(result.current.debouncedSearchTerm).toBe('');
    expect(result.current.normalizedSearchTerm).toBe('');

    // Fast-forward part of the delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedSearchTerm).toBe('');

    // Fast-forward remaining delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedSearchTerm).toBe('hello world');
    expect(result.current.normalizedSearchTerm).toBe('hello world');
    expect(result.current.isSearching).toBe(true);
  });

  it('resets timer if searchTerm changes rapidly', () => {
    const { result } = renderHook(() => useDebounceSearch({ delayMs: 300 }));

    act(() => {
      result.current.setSearchTerm('foo');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.setSearchTerm('foobar');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedSearchTerm).toBe('');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.debouncedSearchTerm).toBe('foobar');
    expect(result.current.normalizedSearchTerm).toBe('foobar');
  });

  it('clears search immediately when clearSearch is called', () => {
    const { result } = renderHook(() => useDebounceSearch({ initialValue: 'test' }));

    expect(result.current.isSearching).toBe(true);

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.debouncedSearchTerm).toBe('');
    expect(result.current.normalizedSearchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
  });
});
