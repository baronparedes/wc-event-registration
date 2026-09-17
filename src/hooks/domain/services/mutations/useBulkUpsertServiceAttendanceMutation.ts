import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { SERVICE_LAYOUTS_QUERY_KEY } from '../queries/useServiceLayoutsQuery';

export type BulkServiceAttendanceCsvRowInput = {
  user_id: string;
  rfid?: string | null;
  service_date: string;
  time_slot: string;
  checked_in_at?: string;
  is_walk_in?: boolean;
  is_override?: boolean;
  is_manual_entry?: boolean;
  service_seat_id?: string | null;
  metadata?: Record<string, unknown>;
};

export type BulkUpsertServiceAttendanceRequest = {
  layout_id: string;
  rows: BulkServiceAttendanceCsvRowInput[];
};

export type BulkUpsertServiceAttendanceResponse = {
  success: boolean;
  message?: string;
  insertedCount?: number;
};

export function useBulkUpsertServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkUpsertServiceAttendanceRequest) => {
      const caller = createEdgeFunctionCaller<
        BulkUpsertServiceAttendanceRequest,
        BulkUpsertServiceAttendanceResponse
      >('bulk-upsert-service-attendance');

      const response = await caller(payload);
      if (!response.success) {
        throw new Error(response.message || 'Bulk upsert failed');
      }

      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
      // Invalidate layouts and seats just in case
      void queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}
