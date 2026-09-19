import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

import { ADMIN_FORMS_QUERY_KEY } from '../queries/useAdminFormsQuery';

export type DuplicateFormInput = {
  source_form_id: string;
  new_title: string;
  new_slug: string;
};

export function useDuplicateFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DuplicateFormInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        new_form_id?: string;
        error?: string;
      }>('duplicate-form', {
        body: input,
      });

      if (error) {
        throw error;
      }

      if (!data || !data.success || !data.new_form_id) {
        throw new Error(data?.error || 'Failed to duplicate form');
      }

      // Re-using the same general audit log mechanism used for forms.
      // There's no specific 'create_form' action in admin-audit types right now if we only have event ones,
      // but let's use what we have or follow what useSaveFormMutation does.

      return data.new_form_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_FORMS_QUERY_KEY });
    },
  });
}
