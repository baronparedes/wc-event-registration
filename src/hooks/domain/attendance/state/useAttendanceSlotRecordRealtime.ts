import { useEffect } from 'react';

import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

import type { AttendanceSlotRecordInsertEvent } from '@/lib/domain/attendance/types';
import { supabase } from '@/lib/infrastructure';

type AttendanceSlotRecordRow = {
  event_id?: unknown;
  check_in_id?: unknown;
  slot?: unknown;
  recorded_at?: unknown;
};

type UseAttendanceSlotRecordRealtimeOptions = {
  onSlotRecord: (event: AttendanceSlotRecordInsertEvent) => void;
  enabled?: boolean;
};

function toSlotRecordInsertEvent(
  payload: RealtimePostgresInsertPayload<AttendanceSlotRecordRow>,
): AttendanceSlotRecordInsertEvent | null {
  const row = payload.new;

  if (
    !row ||
    typeof row.event_id !== 'string' ||
    typeof row.check_in_id !== 'string' ||
    typeof row.slot !== 'string' ||
    typeof row.recorded_at !== 'string'
  ) {
    return null;
  }

  return {
    event_id: row.event_id,
    check_in_id: row.check_in_id,
    slot_record: {
      slot: row.slot,
      recorded_at: row.recorded_at,
    },
  };
}

/**
 * Subscribes to attendance slot record insert events for a single event.
 * Consumers can patch in-memory/local caches immediately when slot records are added.
 */
export function useAttendanceSlotRecordRealtime(
  eventId: string | undefined,
  options: UseAttendanceSlotRecordRealtimeOptions,
) {
  const { onSlotRecord, enabled = true } = options;

  useEffect(() => {
    if (!eventId || !enabled) {
      return;
    }

    const channel = supabase
      .channel(`attendance-slot-records:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_slot_records',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const parsed = toSlotRecordInsertEvent(
            payload as RealtimePostgresInsertPayload<AttendanceSlotRecordRow>,
          );
          if (parsed) {
            onSlotRecord(parsed);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, enabled, onSlotRecord]);
}
