import { useMutation } from '@tanstack/react-query';

import { createEdgeFunctionTextCaller } from '@/lib/infrastructure';

type DownloadAttendanceCSVRequest = {
  event_id: string;
};

/** Downloads the attendance CSV template with existing attendee answers. */
export function useDownloadAttendanceCSVMutation(eventId: string) {
  return useMutation({
    mutationFn: () => {
      const caller =
        createEdgeFunctionTextCaller<DownloadAttendanceCSVRequest>('download-attendance-csv');
      return caller({ event_id: eventId });
    },
  });
}
