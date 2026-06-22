import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export const ADMIN_AUTH_QUERY_KEY = ['admin-auth-state'] as const

export type AdminAuthState = {
  isAuthenticated: boolean
  session: Session | null
  adminRole: 'admin' | 'super_admin' | null
}

type AdminRow = {
  role: 'admin' | 'super_admin'
}

async function fetchAdminAuthState(): Promise<AdminAuthState> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session) {
    return {
      isAuthenticated: false,
      session: null,
      adminRole: null,
    }
  }

  const { data: adminRow, error: adminError } = await supabase
    .from('admins')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .maybeSingle<AdminRow>()

  if (adminError) {
    throw adminError
  }

  if (!adminRow) {
    return {
      isAuthenticated: false,
      session,
      adminRole: null,
    }
  }

  return {
    isAuthenticated: true,
    session,
    adminRole: adminRow.role,
  }
}

export function useAdminAuthQuery() {
  return useQuery({
    queryKey: ADMIN_AUTH_QUERY_KEY,
    queryFn: fetchAdminAuthState,
  })
}

export function useAdminLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        throw error
      }

      const authState = await fetchAdminAuthState()

      if (!authState.isAuthenticated) {
        await supabase.auth.signOut()
        throw new Error('This account is not authorized as an admin.')
      }

      return authState
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY })
    },
  })
}

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
