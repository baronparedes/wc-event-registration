import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BulkPublicRegistrationCsvRowInput } from '@/lib/domain/public-registrations';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_PUBLIC_REGISTRATIONS_QUERY_KEY } from '../queries/useAdminPublicRegistrationsQuery';

type BulkUpsertPublicRegistrationsRequest = {
  event_id: string;
  rows: BulkPublicRegistrationCsvRowInput[];
  uploaded_field_keys?: string[];
};

type BulkUpsertPublicRegistrationsResponse = {
  success: boolean;
  imported_count: number;
  created_count: number;
  updated_count: number;
  error?: string;
};

/** Bulk-upserts public registrations (create or update) using server-side validation. */
export function useBulkUpsertPublicRegistrationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: BulkUpsertPublicRegistrationsRequest,
    ): Promise<BulkUpsertPublicRegistrationsResponse> => {
      const caller = createEdgeFunctionCaller<
        BulkUpsertPublicRegistrationsRequest,
        BulkUpsertPublicRegistrationsResponse
      >('bulk-upsert-public-registrations');

      return caller(input);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_PUBLIC_REGISTRATIONS_QUERY_KEY(variables.event_id),
      });
      queryClient.invalidateQueries({
        queryKey: ['publicRegistrationCount', variables.event_id],
      });
    },
  });
}
