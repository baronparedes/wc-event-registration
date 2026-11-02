import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchRecruitmentSettings } from '@/lib/domain/recruitment';

export function useRecruitmentSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.recruitmentSettings(),
    queryFn: fetchRecruitmentSettings,
    enabled,
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
