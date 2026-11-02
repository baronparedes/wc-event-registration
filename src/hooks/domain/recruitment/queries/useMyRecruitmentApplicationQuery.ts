import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { fetchMyRecruitmentApplication } from '@/lib/domain/recruitment';

export function useMyRecruitmentApplicationQuery(authUserId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.myRecruitmentApplication(authUserId),
    queryFn: fetchMyRecruitmentApplication,
    enabled: Boolean(authUserId) && enabled,
  });
}
