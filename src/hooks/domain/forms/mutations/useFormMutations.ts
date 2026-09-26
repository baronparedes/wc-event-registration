import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createForm,
  createFormField,
  deleteFormField,
  reorderFormFields,
  submitFormSubmission,
  updateForm,
  updateFormField,
} from '@/lib/domain/forms';
import type {
  AdminFormInput,
  FormFieldInput,
  SubmitFormSubmissionPayload,
} from '@/lib/domain/forms';

import { adminFormQueryKey } from '../queries/useAdminFormQuery';
import { ADMIN_FORMS_QUERY_KEY } from '../queries/useAdminFormsQuery';
import { formFieldsQueryKey } from '../queries/useFormFieldsQuery';

export function useSaveFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: AdminFormInput }) => {
      if (id) {
        return updateForm(id, data);
      } else {
        return createForm(data);
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
        return updateFormField(id, data);
      } else {
        return createFormField(formId, data);
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
      await deleteFormField(fieldId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(formId, true) });
      queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(formId, false) });
    },
  });
}

export function useReorderFormFieldsMutation(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update display_order for each field based on its new position in a single RPC call
      await reorderFormFields(formId, orderedIds);
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
    mutationFn: async (payload: SubmitFormSubmissionPayload) => {
      return submitFormSubmission(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
    },
  });
}
