import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

interface UpdateMemberIdRequest {
  id: string;
  member_id: string;
}

interface UpdateMemberIdResponse {
  success: true;
  id: string;
  member_id: string;
}

const callUpdateMemberId = createEdgeFunctionCaller<UpdateMemberIdRequest, UpdateMemberIdResponse>(
  'update-member-id',
);

/**
 * Updates a member's ID with admin verification via Edge Function.
 * Invalidates admin members and specific member query cache on success.
 */
export function useUpdateMemberIdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      newMemberId,
    }: {
      id: string;
      newMemberId: string;
    }): Promise<UpdateMemberIdResponse> => {
      return callUpdateMemberId({
        id,
        member_id: newMemberId.trim(),
      });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(id) });
    },
  });
}
