import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

export function formBySlugQueryKey(slug: string) {
  return ['form-by-slug', slug] as const;
}

interface GetPublicFormRequest {
  slug: string;
}

interface GetPublicFormResponse {
  success: true;
  form: AdminForm | null;
}

const callGetPublicForm = createEdgeFunctionCaller<GetPublicFormRequest, GetPublicFormResponse>(
  'get-public-form',
);

export function useFormBySlugQuery(slug?: string) {
  return useQuery<AdminForm | null, Error>({
    queryKey: formBySlugQueryKey(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: async (): Promise<AdminForm | null> => {
      if (!slug) return null;
      const response = await callGetPublicForm({ slug });
      return response.form;
    },
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
