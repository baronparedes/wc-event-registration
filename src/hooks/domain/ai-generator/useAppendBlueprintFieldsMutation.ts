import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueprintDynamicField,
  appendEventFieldsFromBlueprint,
  appendFormFieldsFromBlueprint,
} from '@/lib/domain/ai-generator';

export type AppendBlueprintFieldsPayload = {
  domain: 'event' | 'form';
  entityId: string;
  fields: BlueprintDynamicField[];
};

export type UseAppendBlueprintFieldsOptions = Omit<
  UseMutationOptions<void, Error, AppendBlueprintFieldsPayload>,
  'mutationFn'
>;

export function useAppendBlueprintFieldsMutation(options?: UseAppendBlueprintFieldsOptions) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AppendBlueprintFieldsPayload>({
    mutationFn: async ({ domain, entityId, fields }) => {
      if (domain === 'event') {
        await appendEventFieldsFromBlueprint(entityId, fields);
      } else {
        await appendFormFieldsFromBlueprint(entityId, fields);
      }
    },
    onSuccess: (...args) => {
      const variables = args[1];
      if (variables.domain === 'event') {
        queryClient.invalidateQueries({
          queryKey: ['admin-event-fields', variables.entityId],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ['form-fields', variables.entityId],
        });
      }
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
