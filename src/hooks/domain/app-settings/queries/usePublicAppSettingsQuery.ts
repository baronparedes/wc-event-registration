import { useContext } from 'react';

import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  DEFAULT_PUBLIC_APP_SETTINGS,
  type PublicAppSettingsMap,
  fetchPublicAppSettings,
} from '@/lib/domain/app-settings';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function usePublicAppSettingsQuery(enabled = true) {
  const contextClient = useContext(QueryClientContext);
  return useQuery<PublicAppSettingsMap>(
    {
      queryKey: QUERY_KEYS.publicAppSettings(),
      queryFn: fetchPublicAppSettings,
      staleTime: QUERY_STALE_TIME_MS.adminList,
      placeholderData: DEFAULT_PUBLIC_APP_SETTINGS,
      enabled: Boolean(contextClient) && enabled,
    },
    contextClient ?? fallbackQueryClient,
  );
}
