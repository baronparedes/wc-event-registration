import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { fetchRecruitmentApplicationByToken } from '@/lib/domain/recruitment';

export function useRecruitmentApplicationByTokenQuery(token: string | null) {
  const normalizedToken = token?.trim() ?? '';
  return useQuery({
    queryKey: QUERY_KEYS.recruitmentApplicationByToken(normalizedToken),
    queryFn: () => fetchRecruitmentApplicationByToken(normalizedToken),
    enabled: normalizedToken.length > 0,
  });
}
