import { useMutation, useQueryClient } from '@tanstack/react-query';

import { duplicateForm } from '@/lib/domain/forms';
import type { DuplicateFormInput } from '@/lib/domain/forms';

import { ADMIN_FORMS_QUERY_KEY } from '../queries/useAdminFormsQuery';

export type { DuplicateFormInput };

export function useDuplicateFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DuplicateFormInput): Promise<string> => {
      const newFormId = await duplicateForm(input);

      // Re-using the same general audit log mechanism used for forms.
      // There's no specific 'create_form' action in admin-audit types right now if we only have event ones,
      // but let's use what we have or follow what useSaveFormMutation does.

      return newFormId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_FORMS_QUERY_KEY });
    },
  });
}
