import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

export const PUBLIC_FORMS_QUERY_KEY = ['public-forms'] as const;

interface GetPublicFormsResponse {
  success: true;
  forms: AdminForm[];
}

const callGetPublicForms = createEdgeFunctionCaller<Record<string, never>, GetPublicFormsResponse>(
  'get-public-forms',
);

export function usePublicFormsQuery() {
  return useQuery<AdminForm[], Error>({
    queryKey: PUBLIC_FORMS_QUERY_KEY,
    queryFn: async (): Promise<AdminForm[]> => {
      const response = await callGetPublicForms({});
      return response.forms ?? [];
    },
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
