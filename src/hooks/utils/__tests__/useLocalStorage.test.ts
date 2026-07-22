import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('returns parsed value from localStorage', () => {
      localStorage.setItem('my-key', JSON.stringify({ value: 42 }));

      const { result } = renderHook(() => useLocalStorage<{ value: number }>('my-key'));

      expect(result.current.get()).toEqual({ value: 42 });
    });

    it('returns null when key is null', () => {
      const { result } = renderHook(() => useLocalStorage<string>(null));

      expect(result.current.get()).toBeNull();
    });

    it('returns null when key is undefined', () => {
      const { result } = renderHook(() => useLocalStorage<string>(undefined));

      expect(result.current.get()).toBeNull();
    });

    it('returns null when item is not found in localStorage', () => {
      const { result } = renderHook(() => useLocalStorage<string>('missing-key'));

      expect(result.current.get()).toBeNull();
    });

    it('returns null when parsing fails', () => {
      localStorage.setItem('bad-json', 'not-valid-json{');

      const { result } = renderHook(() => useLocalStorage<object>('bad-json'));

      expect(result.current.get()).toBeNull();
    });

    it('uses a custom parse function when provided', () => {
      localStorage.setItem('csv-key', 'a,b,c');

      const { result } = renderHook(() =>
        useLocalStorage<string[]>('csv-key', {
          parse: (raw) => raw.split(','),
          stringify: (value) => value.join(','),
        }),
      );

      expect(result.current.get()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('set', () => {
    it('stores stringified value in localStorage and returns true', () => {
      const { result } = renderHook(() => useLocalStorage<{ name: string }>('user-key'));

      let stored = false;
      act(() => {
        stored = result.current.set({ name: 'Alice' });
      });

      expect(stored).toBe(true);
      expect(localStorage.getItem('user-key')).toBe(JSON.stringify({ name: 'Alice' }));
    });

    it('returns false when key is null', () => {
      const { result } = renderHook(() => useLocalStorage<string>(null));

      let stored = false;
      act(() => {
        stored = result.current.set('value');
      });

      expect(stored).toBe(false);
    });

    it('returns false when key is undefined', () => {
      const { result } = renderHook(() => useLocalStorage<string>(undefined));

      let stored = false;
      act(() => {
        stored = result.current.set('value');
      });

      expect(stored).toBe(false);
    });

    it('returns false on storage error', () => {
      const { result } = renderHook(() => useLocalStorage<string>('quota-key'));

      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      let stored = true;
      act(() => {
        stored = result.current.set('large-value');
      });

      expect(stored).toBe(false);
      spy.mockRestore();
    });

    it('uses a custom stringify function when provided', () => {
      const { result } = renderHook(() =>
        useLocalStorage<string[]>('list-key', {
          parse: (raw) => raw.split(','),
          stringify: (value) => value.join(','),
        }),
      );

      act(() => {
        result.current.set(['x', 'y', 'z']);
      });

      expect(localStorage.getItem('list-key')).toBe('x,y,z');
    });
  });

  describe('remove', () => {
    it('removes an existing item from localStorage and returns true', () => {
      localStorage.setItem('remove-key', 'some-value');

      const { result } = renderHook(() => useLocalStorage<string>('remove-key'));

      let removed = false;
      act(() => {
        removed = result.current.remove();
      });

      expect(removed).toBe(true);
      expect(localStorage.getItem('remove-key')).toBeNull();
    });

    it('returns false when key is null', () => {
      const { result } = renderHook(() => useLocalStorage<string>(null));

      let removed = false;
      act(() => {
        removed = result.current.remove();
      });

      expect(removed).toBe(false);
    });

    it('returns false when key is undefined', () => {
      const { result } = renderHook(() => useLocalStorage<string>(undefined));

      let removed = false;
      act(() => {
        removed = result.current.remove();
      });

      expect(removed).toBe(false);
    });

    it('returns false on storage error', () => {
      const { result } = renderHook(() => useLocalStorage<string>('error-key'));

      const spy = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      let removed = true;
      act(() => {
        removed = result.current.remove();
      });

      expect(removed).toBe(false);
      spy.mockRestore();
    });
  });

  describe('stable references', () => {
    it('returns the same get/set/remove references across re-renders when key is unchanged', () => {
      const { result, rerender } = renderHook(() => useLocalStorage<string>('stable-key'));

      const first = result.current;
      rerender();
      const second = result.current;

      expect(second.get).toBe(first.get);
      expect(second.set).toBe(first.set);
      expect(second.remove).toBe(first.remove);
    });
  });
});
