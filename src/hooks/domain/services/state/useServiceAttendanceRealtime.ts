import { useEffect } from 'react';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import type {
  ServiceAttendanceRealtimeEvent,
  ServiceAttendanceRealtimeEventType,
} from '@/lib/domain/services/types';
import { supabase } from '@/lib/infrastructure';

type ServiceAttendanceRow = {
  id?: unknown;
  user_id?: unknown;
  service_date?: unknown;
  time_slot?: unknown;
  checked_in_at?: unknown;
  is_walk_in?: unknown;
  is_override?: unknown;
};

export type UseServiceAttendanceRealtimeOptions = {
  onAttendanceChange: (event: ServiceAttendanceRealtimeEvent) => void;
  enabled?: boolean;
};

function isEventType(value: string): value is ServiceAttendanceRealtimeEventType {
  return value === 'INSERT' || value === 'UPDATE' || value === 'DELETE';
}

function toServiceAttendanceEvent(
  payload: RealtimePostgresChangesPayload<ServiceAttendanceRow>,
): ServiceAttendanceRealtimeEvent | null {
  if (!isEventType(payload.eventType)) {
    return null;
  }

  const rawRow = payload.eventType === 'DELETE' ? payload.old : payload.new;
  if (!rawRow || typeof rawRow !== 'object') {
    return null;
  }

  const row = rawRow as ServiceAttendanceRow;

  return {
    eventType: payload.eventType,
    id: typeof row.id === 'string' ? row.id : null,
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    service_date: typeof row.service_date === 'string' ? row.service_date : null,
    time_slot: typeof row.time_slot === 'string' ? row.time_slot : null,
    checked_in_at: typeof row.checked_in_at === 'string' ? row.checked_in_at : null,
    is_walk_in: Boolean(row.is_walk_in),
    is_override: Boolean(row.is_override),
  };
}

/**
 * Subscribes to service attendance changes (INSERT, UPDATE, DELETE) for a service date or across all services.
 * Consumers can refresh or invalidate caches immediately for cross-device freshness.
 */
export function useServiceAttendanceRealtime(
  serviceDate: string | undefined,
  options: UseServiceAttendanceRealtimeOptions,
) {
  const { onAttendanceChange, enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channelName = serviceDate
      ? `service-attendance:${serviceDate}`
      : 'service-attendance:all';

    const filter = serviceDate ? `service_date=eq.${serviceDate}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_attendance',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const parsed = toServiceAttendanceEvent(
            payload as RealtimePostgresChangesPayload<ServiceAttendanceRow>,
          );

          if (!parsed) return;

          onAttendanceChange(parsed);
        },
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[service-attendance] realtime subscription issue', {
            serviceDate,
            status,
            error,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, onAttendanceChange, serviceDate]);
}
