import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

/** Restores a soft-deleted member by marking the user record active. */
export function useRestoreMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      const { data: updatedMember, error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', id)
        .eq('is_active', false)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedMember) throw new Error('Member not found');
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(id) });
      queryClient.invalidateQueries({ queryKey: ['admin-member', id, true] });
    },
  });
}
