import { useContext } from 'react';

import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchPublicRecruitmentConfig } from '@/lib/domain/recruitment';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function usePublicRecruitmentConfigQuery(enabled = true) {
  const contextClient = useContext(QueryClientContext);
  return useQuery(
    {
      queryKey: QUERY_KEYS.publicRecruitmentConfig(),
      queryFn: fetchPublicRecruitmentConfig,
      enabled: Boolean(contextClient) && enabled,
      staleTime: QUERY_STALE_TIME_MS.adminList,
    },
    contextClient ?? fallbackQueryClient,
  );
}
