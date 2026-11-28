import { useContext } from 'react';

import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  type AppSettingsMap,
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
} from '@/lib/domain/app-settings';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function useAppSettingsQuery(enabled = true) {
  const contextClient = useContext(QueryClientContext);
  return useQuery<AppSettingsMap>(
    {
      queryKey: QUERY_KEYS.appSettings(),
      queryFn: fetchAppSettings,
      staleTime: QUERY_STALE_TIME_MS.adminList,
      placeholderData: DEFAULT_APP_SETTINGS,
      enabled: Boolean(contextClient) && enabled,
    },
    contextClient ?? fallbackQueryClient,
  );
}
