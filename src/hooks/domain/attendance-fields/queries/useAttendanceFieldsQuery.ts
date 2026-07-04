import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

type UseAttendanceFieldsQueryOptions = {
  activeOnly?: boolean;
};

/**
 * Fetches all attendance fields for the given event, ordered by display_order.
 * Used in the admin attendance field builder.
 */
export function useAttendanceFieldsQuery(
  eventId: string | undefined,
  options: UseAttendanceFieldsQueryOptions = {},
) {
  const activeOnly = options.activeOnly ?? false;

  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceFieldsByActivity(eventId, activeOnly),
    queryFn: async (): Promise<AttendanceField[]> => {
      if (!eventId) return [];
      let query = supabase
        .from('attendance_fields')
        .select(
          'id, event_id, field_key, label, field_type, is_required, is_active, display_order, options, validation_rules, created_at, updated_at',
        )
        .eq('event_id', eventId);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as AttendanceField[];
    },
    enabled: Boolean(eventId),
  });
}
