import { type UseMutationOptions, useMutation } from '@tanstack/react-query';

import {
  type GenerateBroadcastDraftPayload,
  type GenerateBroadcastDraftResponse,
  generateBroadcastDraft,
} from '@/lib/domain/notifications';

export type UseBroadcastDraftAiOptions = Omit<
  UseMutationOptions<GenerateBroadcastDraftResponse, Error, GenerateBroadcastDraftPayload>,
  'mutationFn'
>;

export function useBroadcastDraftAi(options?: UseBroadcastDraftAiOptions) {
  return useMutation<GenerateBroadcastDraftResponse, Error, GenerateBroadcastDraftPayload>({
    mutationFn: (payload) => generateBroadcastDraft(payload),
    ...options,
  });
}
