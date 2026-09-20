import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { FormSubmission } from '@/lib/domain/forms';
import { supabase } from '@/lib/infrastructure';

export function formSubmissionsQueryKey(formId: string) {
  return ['form-submissions', formId] as const;
}

export function useFormSubmissionsQuery(formId?: string) {
  return useQuery<FormSubmission[], Error>({
    queryKey: formSubmissionsQueryKey(formId ?? ''),
    enabled: Boolean(formId),
    queryFn: async (): Promise<FormSubmission[]> => {
      if (!formId) return [];
      const trimmed = formId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

      let targetFormId = trimmed;
      if (!isUuid) {
        const { data: formRecord, error: formError } = await supabase
          .from('forms')
          .select('id')
          .eq('slug', trimmed)
          .maybeSingle();

        if (formError) throw formError;
        if (!formRecord?.id) return [];
        targetFormId = formRecord.id;
      }

      const { data, error } = await supabase
        .from('form_submissions')
        .select(
          `
          *,
          users (
            member_id,
            full_name,
            email
          ),
          form_submission_answers (
            id,
            submission_id,
            form_field_id,
            answer_text,
            answer_number,
            answer_boolean,
            answer_date,
            answer_json,
            form_fields (
              field_key,
              label,
              field_type
            )
          )
        `,
        )
        .eq('form_id', targetFormId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as FormSubmission[];
    },
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
