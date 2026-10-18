import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type DelegateApprovalInput,
  type DelegateApprovalResponse,
  delegateApproval,
} from '@/lib/domain/approvals';

import { APPROVAL_REQUESTS_QUERY_KEY } from '../queries/useApprovalRequestsQuery';

export function useDelegateApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation<DelegateApprovalResponse, Error, DelegateApprovalInput>({
    mutationFn: (input) => delegateApproval(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUESTS_QUERY_KEY });
    },
  });
}
