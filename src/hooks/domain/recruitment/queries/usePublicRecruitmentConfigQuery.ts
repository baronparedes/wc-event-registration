import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchPublicRecruitmentConfig } from '@/lib/domain/recruitment';

export function usePublicRecruitmentConfigQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.publicRecruitmentConfig(),
    queryFn: fetchPublicRecruitmentConfig,
    enabled,
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
