import { useMutation } from '@tanstack/react-query';

import type { ExportUnregisteredMembersCsvInput } from '@/lib/domain/attendance';
import { createEdgeFunctionTextCaller } from '@/lib/infrastructure';

/** Triggers CSV export for unregistered members in an event. */
export function useExportUnregisteredMembersCSVMutation(eventId: string) {
  return useMutation({
    mutationFn: () => {
      const caller = createEdgeFunctionTextCaller<ExportUnregisteredMembersCsvInput>(
        'export-unregistered-members-csv',
      );

      return caller({
        event_id: eventId,
      });
    },
  });
}
