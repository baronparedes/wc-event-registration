import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ApprovalDecisionResponse,
  type SubmitApprovalDecisionInput,
  submitApprovalDecision,
} from '@/lib/domain/approvals';

import { APPROVAL_REQUESTS_QUERY_KEY } from '../queries/useApprovalRequestsQuery';
import { APPROVAL_REVIEW_QUERY_KEY } from '../queries/useApprovalReviewQuery';

export function useSubmitApprovalDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApprovalDecisionResponse, Error, SubmitApprovalDecisionInput>({
    mutationFn: (input) => submitApprovalDecision(input),
    onSuccess: (_, variables) => {
      // Invalidate general approval requests query
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUESTS_QUERY_KEY });

      // Invalidate specific token review query if applicable
      if (variables.token) {
        queryClient.invalidateQueries({
          queryKey: [...APPROVAL_REVIEW_QUERY_KEY, variables.token],
        });
      }
    },
  });
}
