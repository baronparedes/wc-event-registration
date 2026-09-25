import { useEffect, useMemo, useState } from 'react';

import { TIMING } from '@/config/constants';

export interface UseDebounceSearchOptions {
  initialValue?: string;
  delayMs?: number;
}

export interface UseDebounceSearchResult {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  debouncedSearchTerm: string;
  normalizedSearchTerm: string;
  clearSearch: () => void;
  isSearching: boolean;
}

/**
 * Custom hook to manage search input state with debouncing and normalization.
 */
export function useDebounceSearch(options: UseDebounceSearchOptions = {}): UseDebounceSearchResult {
  const { initialValue = '', delayMs = TIMING.searchDebounceMs } = options;
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm, delayMs]);

  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm]);
  const isSearching = normalizedSearchTerm.length > 0;

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    normalizedSearchTerm,
    clearSearch,
    isSearching,
  };
}
