import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { FormField } from '@/lib/domain/forms';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface GetPublicFormFieldsRequest {
  form_id: string;
  audience?: 'members' | 'public';
}

interface GetPublicFormFieldsResponse {
  success: true;
  fields: FormField[];
}

const callGetPublicFormFields = createEdgeFunctionCaller<
  GetPublicFormFieldsRequest,
  GetPublicFormFieldsResponse
>('get-public-form-fields');

export function publicFormFieldsQueryKey(formId: string, audience?: 'members' | 'public') {
  return ['public-form-fields', formId, audience ?? 'all'] as const;
}

export function usePublicFormFieldsQuery(formId?: string, audience?: 'members' | 'public') {
  return useQuery<FormField[], Error>({
    queryKey: publicFormFieldsQueryKey(formId ?? '', audience),
    enabled: Boolean(formId),
    queryFn: async (): Promise<FormField[]> => {
      if (!formId) return [];
      const response = await callGetPublicFormFields({
        form_id: formId,
        ...(audience ? { audience } : {}),
      });
      return response.fields ?? [];
    },
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
