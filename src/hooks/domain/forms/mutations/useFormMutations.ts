import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AdminFormInput, FormFieldInput } from '@/lib/domain/forms';
import { supabase } from '@/lib/infrastructure';
import { ADMIN_FORMS_QUERY_KEY } from '../queries/useAdminFormsQuery';
import { adminFormQueryKey } from '../queries/useAdminFormQuery';
import { formFieldsQueryKey } from '../queries/useFormFieldsQuery';

export function useSaveFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: AdminFormInput }) => {
      if (id) {
        const { data: form, error } = await supabase
          .from('forms')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return form;
      } else {
        const { data: form, error } = await supabase.from('forms').insert(data).select().single();

        if (error) throw error;
        return form;
      }
    },
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_FORMS_QUERY_KEY });
      if (form?.id) {
        queryClient.invalidateQueries({ queryKey: adminFormQueryKey(form.id) });
      }
    },
  });
}

export function useSaveFormFieldMutation(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: FormFieldInput }) => {
      if (id) {
        const { data: field, error } = await supabase
          .from('form_fields')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return field;
      } else {
        const { data: field, error } = await supabase
          .from('form_fields')
          .insert({ ...data, form_id: formId })
          .select()
          .single();

        if (error) throw error;
        return field;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(formId, true) });
      queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(formId, false) });
    },
  });
}

export function useDeleteFormFieldMutation(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from('form_fields').delete().eq('id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(formId, true) });
      queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(formId, false) });
    },
  });
}

export function useSubmitFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      form_slug: string;
      member_id?: string;
      public_registrant_info?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
      };
      responses: Record<string, unknown>;
      idempotency_key: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('submit-form-submission', {
        body: payload,
      });

      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit form response');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
    },
  });
}
