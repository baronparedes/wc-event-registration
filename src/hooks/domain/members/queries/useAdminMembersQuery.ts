import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/infrastructure'
import type { AdminMember } from '@/lib/domain/members'

const DEFAULT_PAGE_SIZE = 20

type UserMetadata = {
  role?: unknown
  category?: unknown
}

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`)
}

export const ADMIN_MEMBERS_QUERY_KEY = () => ['admin-members'] as const

export const adminMembersPageQueryKey = (
  pageSize: number,
  cursor: string | null,
  searchTerm: string,
) => [...ADMIN_MEMBERS_QUERY_KEY(), pageSize, cursor, searchTerm] as const

export interface AdminMembersPageParams {
  pageSize?: number
  cursor?: string | null
  searchTerm?: string
}

export interface AdminMembersPage {
  items: AdminMember[]
  nextCursor: string | null
  hasMore: boolean
}

function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0

  const parsed = Number.parseInt(cursor, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

/**
 * Fetches paginated members list for admin view.
 * Returns members with role and category from metadata.
 */
export function useAdminMembersQuery(params?: AdminMembersPageParams) {
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE
  const cursor = params?.cursor ?? null
  const searchTerm = params?.searchTerm?.trim() ?? ''
  const searchTokens = searchTerm.split(/\s+/).filter((token) => token.length > 0)
  const offset = decodeOffsetCursor(cursor)

  return useQuery({
    queryKey: adminMembersPageQueryKey(pageSize, cursor, searchTerm),
    queryFn: async (): Promise<AdminMembersPage> => {
      let query = supabase
        .from('users')
        .select(
          'id, member_id, full_name, first_name, last_name, nickname, email, phone, date_of_birth, metadata, created_at, updated_at',
        )
        .order('full_name', { ascending: true })
        .order('member_id', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (searchTokens.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm)
        const escapedTokenPattern = `%${searchTokens
          .map((token) => escapeOrFilterValue(token))
          .join('%')}%`

        query = query.or(
          `first_name.ilike.%${escapedSearchTerm}%,last_name.ilike.%${escapedSearchTerm}%,nickname.ilike.%${escapedSearchTerm}%,member_id.ilike.%${escapedSearchTerm}%,full_name.ilike.${escapedTokenPattern}`,
        )
      }

      const { data: members, error: membersError } = await query

      if (membersError) throw membersError
      if (!members?.length) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
        }
      }

      // Transform members data
      const items = members.map((member) => {
        const metadata = (member.metadata as UserMetadata | null | undefined) ?? null

        return {
          id: member.id,
          member_id: member.member_id,
          full_name: member.full_name,
          first_name: member.first_name,
          last_name: member.last_name,
          nickname: member.nickname,
          email: member.email,
          phone: member.phone,
          date_of_birth: member.date_of_birth,
          role: readMetadataString(metadata?.role),
          category: readMetadataString(metadata?.category),
          created_at: member.created_at,
          updated_at: member.updated_at,
        } satisfies AdminMember
      })

      const hasMore = items.length === pageSize
      const nextCursor = hasMore ? String(offset + pageSize) : null

      return {
        items,
        nextCursor,
        hasMore,
      }
    },
    staleTime: 0,
  })
}
