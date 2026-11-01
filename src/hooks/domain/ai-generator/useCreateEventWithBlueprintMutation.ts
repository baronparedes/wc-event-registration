import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type CreateEventWithBlueprintInput,
  createEventWithBlueprint,
} from '@/lib/domain/ai-generator';

export type UseCreateEventWithBlueprintOptions = Omit<
  UseMutationOptions<{ id: string; slug: string }, Error, CreateEventWithBlueprintInput>,
  'mutationFn'
>;

export function useCreateEventWithBlueprintMutation(options?: UseCreateEventWithBlueprintOptions) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string; slug: string }, Error, CreateEventWithBlueprintInput>({
    mutationFn: (input) => createEventWithBlueprint(input),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
