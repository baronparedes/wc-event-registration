import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addMemberNote } from '@/lib/domain/members';
import { supabase } from '@/lib/infrastructure';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

export type AddMemberNoteInput = {
  memberId: string;
  text: string;
};

export function useAddMemberNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, text }: AddMemberNoteInput): Promise<void> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        throw new Error('Not authenticated');
      }

      const authorId = session.user.id;
      // Provide a fallback name if full_name is not present
      const authorName = session.user.user_metadata?.full_name || session.user.email || 'Admin';

      await addMemberNote(memberId, text, authorId, authorName);
    },
    onSuccess: (_data, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(memberId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
    },
  });
}
