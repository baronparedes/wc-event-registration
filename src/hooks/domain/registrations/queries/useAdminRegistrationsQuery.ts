import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AdminRegistrationWithMember } from '@/lib/admin/registrationTypes'

type UserMetadata = {
  role?: unknown
  category?: unknown
}

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export const ADMIN_REGISTRATIONS_QUERY_KEY = (eventId: string) =>
  ['admin-registrations', eventId] as const

/**
 * Fetches all registrations for an event with member details.
 * Joins registrations + users + counts answers for display in list view.
 */
export function useAdminRegistrationsQuery(eventId: string) {
  return useQuery({
    queryKey: ADMIN_REGISTRATIONS_QUERY_KEY(eventId),
    queryFn: async (): Promise<AdminRegistrationWithMember[]> => {
      const { data: registrations, error: registrationError } = await supabase
        .from('registrations')
        .select('id, event_id, user_id, status, submitted_at, updated_at')
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: false })

      if (registrationError) throw registrationError
      if (!registrations?.length) return []

      // Fetch user details for all registrations
      const userIds = registrations.map((r) => r.user_id)
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, member_id, full_name, email, phone, metadata')
        .in('id', userIds)

      if (userError) throw userError

      // Fetch answer counts for each registration
      const { data: answerCounts, error: answerError } = await supabase
        .from('registration_answers')
        .select('registration_id')
        .in(
          'registration_id',
          registrations.map((r) => r.id),
        )

      if (answerError) throw answerError

      // Build answer count map
      const answerCountMap = new Map<string, number>()
      answerCounts?.forEach((answer) => {
        const count = (answerCountMap.get(answer.registration_id) ?? 0) + 1
        answerCountMap.set(answer.registration_id, count)
      })

      // Build user map for quick lookup
      const userMap = new Map(users?.map((u) => [u.id, u]) ?? [])

      // Combine data
      return registrations.map((r) => {
        const user = userMap.get(r.user_id)
        const metadata = (user?.metadata as UserMetadata | null | undefined) ?? null

        return {
          ...r,
          member_id: user?.member_id ?? '',
          full_name: user?.full_name ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? null,
          role: readMetadataString(metadata?.role),
          category: readMetadataString(metadata?.category),
          answer_count: answerCountMap.get(r.id) ?? 0,
        }
      })
    },
    staleTime: 0,
  })
}
