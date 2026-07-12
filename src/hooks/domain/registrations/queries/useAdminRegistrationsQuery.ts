import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminRegistrationWithMember } from '@/lib/domain/registrations';
import type { RegistrationStatus } from '@/lib/domain/registrations';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

type RegistrationAnswerCount = {
  count: number | null;
};

type RegistrationListRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  submitted_at: string;
  updated_at: string | null;
  registration_answers?: RegistrationAnswerCount[] | null;
};

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readAnswerCount(value: RegistrationAnswerCount[] | null | undefined): number {
  const count = value?.[0]?.count;
  return typeof count === 'number' ? count : 0;
}

export const ADMIN_REGISTRATIONS_QUERY_KEY = (eventId: string) =>
  ['admin-registrations', eventId] as const;

export const adminRegistrationsPageQueryKey = (
  eventId: string,
  pageSize: number,
  cursor: string | null,
  searchTerm: string,
) => [...ADMIN_REGISTRATIONS_QUERY_KEY(eventId), pageSize, cursor, searchTerm] as const;

export interface AdminRegistrationsPageParams {
  pageSize?: number;
  cursor?: string | null;
  searchTerm?: string;
}

export interface AdminRegistrationsPage {
  items: AdminRegistrationWithMember[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

/**
 * Fetches all registrations for an event with member details.
 * Joins registrations + users + counts answers for display in list view.
 */
export function useAdminRegistrationsQuery(eventId: string, params?: AdminRegistrationsPageParams) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminRegistrationsPageSize;
  const cursor = params?.cursor ?? null;
  const searchTerm = params?.searchTerm?.trim() ?? '';
  const offset = decodeOffsetCursor(cursor);

  return useQuery({
    queryKey: adminRegistrationsPageQueryKey(eventId, pageSize, cursor, searchTerm),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminRegistrationsPage> => {
      let registrationsQuery = supabase
        .from('registrations')
        .select(
          'id, event_id, user_id, status, submitted_at, updated_at, registration_answers(count)',
          { count: 'exact' },
        )
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (searchTerm.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm);
        const { data: matchingUsers, error: userSearchError } = await supabase
          .from('users')
          .select('id')
          .or(
            `full_name.ilike.%${escapedSearchTerm}%,member_id.ilike.%${escapedSearchTerm}%,email.ilike.%${escapedSearchTerm}%`,
          );
        if (userSearchError) throw userSearchError;
        const matchingUserIds = matchingUsers?.map((u) => u.id) ?? [];
        if (matchingUserIds.length === 0) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
            totalCount: 0,
            totalPages: getTotalPages(0, pageSize),
          };
        }
        registrationsQuery = registrationsQuery.in('user_id', matchingUserIds);
      }

      const { data: registrations, error: registrationError, count } = await registrationsQuery;

      if (registrationError) throw registrationError;
      const totalCount = count ?? 0;
      const typedRegistrations = (registrations ?? []) as RegistrationListRow[];

      if (typedRegistrations.length === 0) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount,
          totalPages: getTotalPages(totalCount, pageSize),
        };
      }

      // Fetch user details for all registrations
      const userIds = [...new Set(typedRegistrations.map((r) => r.user_id))];
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, member_id, full_name, email, phone, role, category')
        .in('id', userIds);

      if (userError) throw userError;

      // Build user map for quick lookup
      const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

      // Combine data
      const items = typedRegistrations.map((r) => {
        const user = userMap.get(r.user_id);

        return {
          ...r,
          member_id: user?.member_id ?? '',
          full_name: user?.full_name ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? null,
          role: readMetadataString(user?.role),
          category: readMetadataString(user?.category),
          answer_count: readAnswerCount(r.registration_answers),
        };
      });

      const hasMore = offset + items.length < totalCount;

      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : null,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      };
    },
    staleTime: QUERY_STALE_TIME_MS.adminList,
    refetchOnWindowFocus: false,
  });
}
