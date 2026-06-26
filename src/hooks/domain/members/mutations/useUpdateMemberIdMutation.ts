import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/infrastructure'
import { ADMIN_MEMBERS_QUERY_KEY } from '../queries/useAdminMembersQuery'
import { ADMIN_MEMBER_QUERY_KEY } from '../queries/useAdminMemberQuery'

/** Updates only the member_id field with extra confirmation. */
export function useUpdateMemberIdMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, newMemberId }: { id: string; newMemberId: string }): Promise<void> => {
      const trimmedId = newMemberId.trim()
      if (!trimmedId) {
        throw new Error('Member ID cannot be empty')
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ member_id: trimmedId })
        .eq('id', id)

      if (updateError) throw updateError
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() })
      queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_QUERY_KEY(id) })
    },
  })
}
