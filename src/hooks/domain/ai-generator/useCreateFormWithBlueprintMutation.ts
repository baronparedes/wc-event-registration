import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type CreateFormWithBlueprintInput,
  createFormWithBlueprint,
} from '@/lib/domain/ai-generator';

export type UseCreateFormWithBlueprintOptions = Omit<
  UseMutationOptions<{ id: string; slug: string }, Error, CreateFormWithBlueprintInput>,
  'mutationFn'
>;

export function useCreateFormWithBlueprintMutation(options?: UseCreateFormWithBlueprintOptions) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string; slug: string }, Error, CreateFormWithBlueprintInput>({
    mutationFn: (input) => createFormWithBlueprint(input),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
