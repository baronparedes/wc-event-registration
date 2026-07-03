import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateMemberInput } from '@/lib/domain/members';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

interface CreateMemberResponse {
  success: true;
  id: string;
  member_id: string;
  full_name: string;
}

const callCreateMember = createEdgeFunctionCaller<CreateMemberInput, CreateMemberResponse>(
  'create-member',
);

/**
 * Creates a new member record with unique Member ID.
 * Invalidates admin members query cache on success.
 */
export function useCreateMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemberInput): Promise<CreateMemberResponse> => {
      return callCreateMember(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
    },
  });
}
