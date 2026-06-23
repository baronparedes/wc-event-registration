import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ADMIN_AUTH_QUERY_KEY, type AdminAuthState } from '@/lib/admin/authUtils'

export function useAdminLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<AdminAuthState>(ADMIN_AUTH_QUERY_KEY, {
        isAuthenticated: false,
        session: null,
        adminRole: null,
      })
      queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY })
    },
  })
}
