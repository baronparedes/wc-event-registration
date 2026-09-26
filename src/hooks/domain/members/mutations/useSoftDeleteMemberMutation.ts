import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setMemberActiveStatus } from '@/lib/domain/members';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

/** Soft deletes a member by marking the user record inactive. */
export function useSoftDeleteMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      const updatedMember = await setMemberActiveStatus(id, false);

      if (!updatedMember) throw new Error('Member not found');
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(id) });
      queryClient.invalidateQueries({ queryKey: ['admin-member', id, true] });
    },
  });
}
