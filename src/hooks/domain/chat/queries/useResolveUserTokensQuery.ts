import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

export type ResolvedToken = {
  id: string;
  name: string;
};

export type ResolveTokensRequest = {
  tokens?: string[];
};

export type ResolveTokensResponse = {
  success: boolean;
  data: Record<string, ResolvedToken>;
};

export const USER_TOKEN_MAP_QUERY_KEY = ['user-token-map'] as const;
export const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

const callResolveTokens = createEdgeFunctionCaller<ResolveTokensRequest, ResolveTokensResponse>(
  'resolve-user-tokens',
);

/**
 * Pre-fetches and caches all user tokens purely in React Query memory (no disk/sessionStorage).
 * Resolves all tokens in frontend memory without making repetitive network calls during chat streaming.
 */
export function useUserTokenMapQuery() {
  return useQuery({
    queryKey: USER_TOKEN_MAP_QUERY_KEY,
    queryFn: async () => {
      const response = await callResolveTokens({});
      return response.data ?? {};
    },
    staleTime: CACHE_DURATION_MS,
    gcTime: CACHE_DURATION_MS,
  });
}

/**
 * Hook to resolve specific user tokens (or all tokens) from the in-memory React Query map.
 */
export function useResolveUserTokensQuery(tokens?: string[]) {
  const query = useUserTokenMapQuery();

  const resolved = useMemo(() => {
    const tokenMap = query.data ?? {};
    if (!tokens || tokens.length === 0) {
      return tokenMap;
    }
    const result: Record<string, ResolvedToken> = {};
    for (const t of tokens) {
      if (tokenMap[t]) {
        result[t] = tokenMap[t];
      }
    }
    return result;
  }, [query.data, tokens]);

  return {
    ...query,
    data: resolved,
  };
}
