import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  type ReviewerUserItem,
  fetchReviewerUserById,
  fetchReviewerUsers,
} from '@/lib/domain/recruitment';

export function useReviewerUsersQuery(searchTerm = '', enabled = true) {
  const trimmed = searchTerm.trim();

  return useQuery<ReviewerUserItem[]>({
    queryKey: QUERY_KEYS.reviewerUsers(trimmed),
    queryFn: () => fetchReviewerUsers(trimmed),
    enabled,
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}

export function useReviewerUserByIdQuery(id?: string, enabled = true) {
  return useQuery<ReviewerUserItem | null>({
    queryKey: QUERY_KEYS.reviewerUserById(id),
    queryFn: () => (id ? fetchReviewerUserById(id) : Promise.resolve(null)),
    enabled: enabled && Boolean(id),
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
