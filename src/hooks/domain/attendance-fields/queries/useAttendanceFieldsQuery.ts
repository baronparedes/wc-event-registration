import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

/**
 * Fetches all attendance fields for the given event, ordered by display_order.
 * Used in the admin attendance field builder.
 */
export function useAttendanceFieldsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceFields(eventId),
    queryFn: async (): Promise<AttendanceField[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('attendance_fields')
        .select(
          'id, event_id, field_key, label, field_type, is_required, is_active, display_order, options, validation_rules, created_at, updated_at',
        )
        .eq('event_id', eventId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as AttendanceField[];
    },
    enabled: Boolean(eventId),
  });
}
