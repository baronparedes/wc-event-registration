import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BulkRegistrationCsvRowInput } from '@/lib/domain/registrations';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_REGISTRATIONS_QUERY_KEY } from '../queries/useAdminRegistrationsQuery';

type BulkUpsertRegistrationsRequest = {
  event_id: string;
  rows: BulkRegistrationCsvRowInput[];
  uploaded_field_keys?: string[];
};

type BulkUpsertRegistrationsResponse = {
  success: boolean;
  imported_count: number;
  created_count: number;
  updated_count: number;
  error?: string;
};

/** Bulk-upserts registrations (create or update) for multiple members using server-side validation. */
export function useBulkUpsertRegistrationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: BulkUpsertRegistrationsRequest,
    ): Promise<BulkUpsertRegistrationsResponse> => {
      const caller = createEdgeFunctionCaller<
        BulkUpsertRegistrationsRequest,
        BulkUpsertRegistrationsResponse
      >('bulk-upsert-registrations');

      return caller(input);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_REGISTRATIONS_QUERY_KEY(variables.event_id),
      });
    },
  });
}
