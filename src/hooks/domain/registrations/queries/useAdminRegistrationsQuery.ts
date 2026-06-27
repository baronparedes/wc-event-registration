import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure'
import type { AdminRegistrationWithMember } from '@/lib/domain/registrations'

const DEFAULT_PAGE_SIZE = 25

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`)
}

type UserMetadata = {
  role?: unknown
  category?: unknown
}

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export const ADMIN_REGISTRATIONS_QUERY_KEY = (eventId: string) =>
  ['admin-registrations', eventId] as const

export const adminRegistrationsPageQueryKey = (
  eventId: string,
  pageSize: number,
  cursor: string | null,
  searchTerm: string,
) => [...ADMIN_REGISTRATIONS_QUERY_KEY(eventId), pageSize, cursor, searchTerm] as const

export interface AdminRegistrationsPageParams {
  pageSize?: number
  cursor?: string | null
  searchTerm?: string
}

export interface AdminRegistrationsPage {
  items: AdminRegistrationWithMember[]
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
  totalPages: number
}

/**
 * Fetches all registrations for an event with member details.
 * Joins registrations + users + counts answers for display in list view.
 */
export function useAdminRegistrationsQuery(eventId: string, params?: AdminRegistrationsPageParams) {
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE
  const cursor = params?.cursor ?? null
  const searchTerm = params?.searchTerm?.trim() ?? ''
  const offset = decodeOffsetCursor(cursor)

  return useQuery({
    queryKey: adminRegistrationsPageQueryKey(eventId, pageSize, cursor, searchTerm),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminRegistrationsPage> => {
      let registrationsQuery = supabase
        .from('registrations')
        .select('id, event_id, user_id, status, submitted_at, updated_at', { count: 'exact' })
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (searchTerm.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm)
        const { data: matchingUsers, error: userSearchError } = await supabase
          .from('users')
          .select('id')
          .or(
            `full_name.ilike.%${escapedSearchTerm}%,member_id.ilike.%${escapedSearchTerm}%,email.ilike.%${escapedSearchTerm}%`,
          )
        if (userSearchError) throw userSearchError
        const matchingUserIds = matchingUsers?.map((u) => u.id) ?? []
        if (matchingUserIds.length === 0) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
            totalCount: 0,
            totalPages: getTotalPages(0, pageSize),
          }
        }
        registrationsQuery = registrationsQuery.in('user_id', matchingUserIds)
      }

      const { data: registrations, error: registrationError, count } = await registrationsQuery

      if (registrationError) throw registrationError
      const totalCount = count ?? 0
      if (!registrations?.length) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount,
          totalPages: getTotalPages(totalCount, pageSize),
        }
      }

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
      const items = registrations.map((r) => {
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

      const hasMore = offset + items.length < totalCount

      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : null,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      }
    },
    staleTime: 0,
  })
}
