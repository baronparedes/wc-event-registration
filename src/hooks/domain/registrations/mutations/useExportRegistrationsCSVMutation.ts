import { useMutation } from '@tanstack/react-query'
import { createEdgeFunctionTextCaller } from '@/lib/supabase'

interface ExportRegistrationsCSVRequest {
  event_id: string
}

/**
 * Triggers a CSV export for all registrations of an event.
 * Calls the export-registrations-csv Edge Function and returns CSV plus optional filename.
 */
export function useExportRegistrationsCSVMutation(eventId: string) {
  return useMutation({
    mutationFn: () => {
      const caller = createEdgeFunctionTextCaller<ExportRegistrationsCSVRequest>(
        'export-registrations-csv',
      )
      return caller({ event_id: eventId })
    },
  })
}
