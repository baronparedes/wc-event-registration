import { useMutation, useQueryClient } from '@tanstack/react-query';

import { duplicateEvent } from '@/lib/domain/events';
import type { DuplicateEventInput } from '@/lib/domain/events';

import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

export type { DuplicateEventInput };

export function useDuplicateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DuplicateEventInput): Promise<string> => {
      return duplicateEvent(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
    },
  });
}
