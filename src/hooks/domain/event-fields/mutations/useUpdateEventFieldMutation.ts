import { useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchEventFieldEventStatus, updateEventField } from '@/lib/domain/event-fields';
import type { AdminEventField, UpdateEventFieldInput } from '@/lib/domain/event-fields';

import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery';

/**
 * Updates an existing event field.
 * On draft events: all properties can be changed.
 * On published events: label, applicability, placeholder/help text, and option capacity rules can be changed.
 * On archived events: no changes are permitted.
 */
export function useUpdateEventFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEventFieldInput): Promise<AdminEventField> => {
      const status = await fetchEventFieldEventStatus(input.event_id);

      if (status === 'archived') {
        throw new Error('Cannot edit fields on archived events.');
      }

      const { id, ...updates } = input;

      if (status === 'published') {
        const allowedPublishedKeys = new Set([
          'event_id',
          'label',
          'applicability',
          'placeholder',
          'help_text',
          'validation_rules',
        ]);
        const lockedKeys = Object.keys(updates).filter((k) => !allowedPublishedKeys.has(k));
        if (lockedKeys.length > 0) {
          throw new Error(
            'Published events can only have field labels, registrant type, placeholders/help text, and option capacity edited. To change field types or validation rules, archive this event and create a new one.',
          );
        }

        if (updates.validation_rules) {
          const rules = updates.validation_rules as Record<string, unknown>;
          const allowedCapacityRuleKeys = new Set(['max_slots', 'max_slots_role_allotments']);
          const disallowedRuleKeys = Object.keys(rules).filter(
            (ruleKey) => !allowedCapacityRuleKeys.has(ruleKey),
          );

          if (disallowedRuleKeys.length > 0) {
            throw new Error(
              'Published events can only update option capacity rules (max_slots and max_slots_role_allotments).',
            );
          }
        }
      }

      return updateEventField(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) });
    },
  });
}
