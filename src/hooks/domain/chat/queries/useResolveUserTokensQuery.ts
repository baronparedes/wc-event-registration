import { useQuery } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

export type ResolvedToken = {
  id: string;
  name: string;
};

export type ResolveTokensRequest = {
  tokens: string[];
};

export type ResolveTokensResponse = {
  success: boolean;
  data: Record<string, ResolvedToken>;
};

const callResolveTokens = createEdgeFunctionCaller<ResolveTokensRequest, ResolveTokensResponse>(
  'resolve-user-tokens',
);

export function useResolveUserTokensQuery(tokens: string[]) {
  return useQuery({
    queryKey: ['resolve-user-tokens', tokens],
    queryFn: async () => {
      if (tokens.length === 0) {
        return {};
      }
      const response = await callResolveTokens({ tokens });
      return response.data;
    },
    enabled: tokens.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour caching
  });
}
