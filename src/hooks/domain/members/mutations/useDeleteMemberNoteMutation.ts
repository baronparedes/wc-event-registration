import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteMemberNote } from '@/lib/domain/members';

import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery';
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery';

export type DeleteMemberNoteInput = {
  memberId: string;
  noteId: string;
};

export function useDeleteMemberNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, noteId }: DeleteMemberNoteInput): Promise<void> => {
      await deleteMemberNote(memberId, noteId);
    },
    onSuccess: (_data, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(memberId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() });
    },
  });
}
