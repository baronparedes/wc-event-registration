import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { type AdminMember, fetchAdminMembersPage } from '@/lib/domain/members';
import { decodeOffsetCursor, getTotalPages } from '@/lib/infrastructure';

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
 * Fetches infinite paginated members list for admin view.
 * Returns members with role and category from metadata.
 */
export function useAdminMembersQuery(params?: AdminMembersPageParams) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminMembersPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';
  const statusFilter = params?.statusFilter ?? 'active';
  const searchTokens = searchTerm.split(/\s+/).filter((token) => token.length > 0);

  return useInfiniteQuery<AdminMembersPage, Error>({
    queryKey: [...ADMIN_MEMBERS_QUERY_KEY(), pageSize, searchTerm, statusFilter],
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: AdminMembersPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }): Promise<AdminMembersPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      const { rows: members, count } = await fetchAdminMembersPage({
        offset,
        pageSize,
        searchTerm,
        searchTokens,
        statusFilter,
      });
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
        const metadata = (member.metadata as Record<string, unknown> | null | undefined) ?? {};

        const extra_metadata: Record<string, string> = {};
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof value === 'string') {
            extra_metadata[key] = value;
          }
        }

        return {
          id: member.id,
          member_id: member.member_id,
          avatar_object_key:
            typeof member.avatar_object_key === 'string' ? member.avatar_object_key : null,
          is_active: member.is_active,
          full_name: member.full_name,
          first_name: member.first_name,
          last_name: member.last_name,
          nickname: member.nickname,
          email: member.email,
          phone: member.phone,
          date_of_birth: member.date_of_birth,
          role: readMetadataString(member.role),
          category: readMetadataString(member.category),
          extra_metadata,
          created_at: member.created_at,
          updated_at: member.updated_at,
          last_activity:
            typeof member.last_activity === 'string' ? member.last_activity : undefined,
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
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
