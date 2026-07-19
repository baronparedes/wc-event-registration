import { useCallback, useMemo } from 'react';

type UseLocalStorageOptions<T> = {
  parse?: (raw: string) => T;
  stringify?: (value: T) => string;
};

function defaultParse<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

function defaultStringify<T>(value: T): string {
  return JSON.stringify(value);
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

/**
 * Provides safe localStorage access with typed parsing and serialization.
 * Returns null/false on storage errors so callers can continue gracefully.
 */
export function useLocalStorage<T = string>(
  key: string | null | undefined,
  options?: UseLocalStorageOptions<T>,
) {
  const parse = options?.parse ?? defaultParse<T>;
  const stringify = options?.stringify ?? defaultStringify<T>;

  const get = useCallback((): T | null => {
    if (!key) return null;

    try {
      const storage = getBrowserStorage();
      if (!storage) return null;

      const raw = storage.getItem(key);
      if (raw === null) return null;

      return parse(raw);
    } catch {
      return null;
    }
  }, [key, parse]);

  const set = useCallback(
    (value: T): boolean => {
      if (!key) return false;

      try {
        const storage = getBrowserStorage();
        if (!storage) return false;

        storage.setItem(key, stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    [key, stringify],
  );

  const remove = useCallback((): boolean => {
    if (!key) return false;

    try {
      const storage = getBrowserStorage();
      if (!storage) return false;

      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }, [key]);

  return useMemo(
    () => ({
      get,
      set,
      remove,
    }),
    [get, set, remove],
  );
}
