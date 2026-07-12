import { useMutation } from '@tanstack/react-query';

import { createEdgeFunctionTextCaller } from '@/lib/infrastructure';

type ExportAttendanceCSVRequest = {
  event_id: string;
};

/** Triggers a dedicated attendance CSV export for an event. */
export function useExportAttendanceCSVMutation(eventId: string) {
  return useMutation({
    mutationFn: () => {
      const caller =
        createEdgeFunctionTextCaller<ExportAttendanceCSVRequest>('export-attendance-csv');
      return caller({ event_id: eventId });
    },
  });
}
