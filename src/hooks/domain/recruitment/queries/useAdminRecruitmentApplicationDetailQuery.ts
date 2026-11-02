import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { fetchAdminRecruitmentApplicationDetail } from '@/lib/domain/recruitment';

export function useAdminRecruitmentApplicationDetailQuery(
  applicationId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: QUERY_KEYS.adminRecruitmentApplication(applicationId),
    queryFn: () => fetchAdminRecruitmentApplicationDetail(applicationId as string),
    enabled: Boolean(applicationId) && enabled,
  });
}
