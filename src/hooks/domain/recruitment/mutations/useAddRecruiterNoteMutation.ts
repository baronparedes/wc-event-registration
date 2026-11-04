import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { addRecruiterNote } from '@/lib/domain/recruitment';
import type { AddRecruiterNotePayload } from '@/lib/domain/recruitment';

export function useAddRecruiterNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddRecruiterNotePayload) => addRecruiterNote(input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.adminRecruitmentApplication(variables.application_id),
        }),
      ]);
    },
  });
}
