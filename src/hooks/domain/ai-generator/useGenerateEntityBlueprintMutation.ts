import { type UseMutationOptions, useMutation } from '@tanstack/react-query';

import {
  type GenerateEntityBlueprintPayload,
  type GenerateEntityBlueprintResponse,
  generateEntityBlueprint,
} from '@/lib/domain/ai-generator';

export type UseGenerateEntityBlueprintOptions = Omit<
  UseMutationOptions<GenerateEntityBlueprintResponse, Error, GenerateEntityBlueprintPayload>,
  'mutationFn'
>;

export function useGenerateEntityBlueprintMutation(options?: UseGenerateEntityBlueprintOptions) {
  return useMutation<GenerateEntityBlueprintResponse, Error, GenerateEntityBlueprintPayload>({
    mutationFn: (payload) => generateEntityBlueprint(payload),
    ...options,
  });
}
