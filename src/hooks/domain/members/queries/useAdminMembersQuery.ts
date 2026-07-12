import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminMember } from '@/lib/domain/members';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

type UserMetadata = Record<string, unknown>;

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export const ADMIN_MEMBERS_QUERY_KEY = () => ['admin-members'] as const;

export const adminMembersPageQueryKey = (
  pageSize: number,
  cursor: string | null,
  searchTerm: string,
  statusFilter: 'active' | 'deleted' | 'all',
) => [...ADMIN_MEMBERS_QUERY_KEY(), pageSize, cursor, searchTerm, statusFilter] as const;

export interface AdminMembersPageParams {
  pageSize?: number;
  cursor?: string | null;
  searchTerm?: string;
  statusFilter?: 'active' | 'deleted' | 'all';
}

export interface AdminMembersPage {
  items: AdminMember[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

/**
 * Fetches paginated members list for admin view.
 * Returns members with role and category from metadata.
 */
export function useAdminMembersQuery(params?: AdminMembersPageParams) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminMembersPageSize;
  const cursor = params?.cursor ?? null;
  const searchTerm = params?.searchTerm?.trim() ?? '';
  const statusFilter = params?.statusFilter ?? 'active';
  const searchTokens = searchTerm.split(/\s+/).filter((token) => token.length > 0);
  const offset = decodeOffsetCursor(cursor);

  return useQuery({
    queryKey: adminMembersPageQueryKey(pageSize, cursor, searchTerm, statusFilter),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminMembersPage> => {
      let query = supabase
        .from('users')
        .select(
          'id, member_id, is_active, full_name, first_name, last_name, nickname, email, phone, date_of_birth, metadata, created_at, updated_at',
          { count: 'exact' },
        );

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'deleted') {
        query = query.eq('is_active', false);
      }

      query = query
        .order('full_name', { ascending: true })
        .order('member_id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (searchTokens.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm);
        const escapedTokenPattern = `%${searchTokens
          .map((token) => escapeOrFilterValue(token))
          .join('%')}%`;

        query = query.or(
          `first_name.ilike.%${escapedSearchTerm}%,last_name.ilike.%${escapedSearchTerm}%,nickname.ilike.%${escapedSearchTerm}%,member_id.ilike.%${escapedSearchTerm}%,full_name.ilike.${escapedTokenPattern}`,
        );
      }

      const { data: members, error: membersError, count } = await query;

      if (membersError) throw membersError;
      const totalCount = count ?? 0;
      if (!members?.length) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount,
          totalPages: getTotalPages(totalCount, pageSize),
        };
      }

      // Transform members data
      const items = members.map((member) => {
        const metadata = (member.metadata as UserMetadata | null | undefined) ?? {};

        const extra_metadata: Record<string, string> = {};
        for (const [key, value] of Object.entries(metadata)) {
          if (key !== 'role' && key !== 'category' && typeof value === 'string') {
            extra_metadata[key] = value;
          }
        }

        return {
          id: member.id,
          member_id: member.member_id,
          is_active: member.is_active,
          full_name: member.full_name,
          first_name: member.first_name,
          last_name: member.last_name,
          nickname: member.nickname,
          email: member.email,
          phone: member.phone,
          date_of_birth: member.date_of_birth,
          role: readMetadataString(metadata['role']),
          category: readMetadataString(metadata['category']),
          extra_metadata,
          created_at: member.created_at,
          updated_at: member.updated_at,
        } satisfies AdminMember;
      });

      const hasMore = offset + items.length < totalCount;
      const nextCursor = hasMore ? String(offset + pageSize) : null;

      return {
        items,
        nextCursor,
        hasMore,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      };
    },
    staleTime: QUERY_STALE_TIME_MS.immediate,
  });
}
