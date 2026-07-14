import { useEdgeHook } from '@/shared/edge.ts';
import {
  errorResponse as sharedErrorResponse,
  successResponse as sharedSuccessResponse,
} from '@/shared/http.ts';
import {
  extractSelectedOptionValuesFromStoredAnswer,
  normalizePrimaryRoleValue,
  parseMaxSlotRoleAllotmentsByOption,
  parseMaxSlotsByOption,
  z,
} from '@/shared/validation.ts';

type EventFieldRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  options: Array<{ value: string; label: string }> | null;
  validation_rules: Record<string, unknown> | null;
};

type RegistrationAnswerRow = {
  answer_text: string | null;
  answer_json: unknown | null;
  registrations:
    | {
        user_id: string | null;
      }
    | Array<{
        user_id: string | null;
      }>
    | null;
};

type PublicRegistrationAnswerRow = {
  answer_text: string | null;
  answer_json: unknown | null;
};

const slotAvailabilityRequestSchema = z.object({
  event_id: z.string().uuid('Event ID must be a valid UUID'),
});

type SlotAvailabilityRequest = z.infer<typeof slotAvailabilityRequestSchema>;

type SlotAvailabilityOption = {
  value: string;
  label: string;
  allotted_slots: number;
  used_slots: number;
  remaining_slots: number;
  remaining_slots_by_role?: Record<string, number>;
};

type SlotAvailabilityField = {
  field_id: string;
  field_key: string;
  field_label: string;
  options: SlotAvailabilityOption[];
};

type UserRoleRow = {
  id: string;
  role: string;
};

function getRegistrationUserId(value: RegistrationAnswerRow['registrations']): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0]?.user_id ?? null;
  }

  return value.user_id;
}

function extractMemberRole(role: string | null): string | null {
  return normalizePrimaryRoleValue(role);
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'event-slot-availability',
    method: 'POST',
    schema: slotAvailabilityRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;
  if (!guard.valid) {
    return guard.response;
  }

  const { event_id: eventId }: SlotAvailabilityRequest = guard.data;

  const supabase = guard.client;

  const { data: eventFields, error: fieldsError } = await supabase
    .from('event_fields')
    .select('id, field_key, label, field_type, options, validation_rules')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (fieldsError) {
    console.error('Slot availability fields lookup error:', fieldsError);
    return sharedErrorResponse(corsHeaders, 500, 'Failed to fetch event fields');
  }

  const slotFields: SlotAvailabilityField[] = [];

  for (const rawField of (eventFields ?? []) as EventFieldRow[]) {
    const maxSlotsByOption = parseMaxSlotsByOption(rawField.validation_rules);
    const roleAllotmentsByOption = parseMaxSlotRoleAllotmentsByOption(rawField.validation_rules);

    for (const [optionValue, allotments] of Object.entries(roleAllotmentsByOption)) {
      const derivedSlots = Object.values(allotments).reduce((sum, value) => sum + value, 0);
      if (derivedSlots > 0) {
        maxSlotsByOption[optionValue] = derivedSlots;
      }
    }

    const constrainedOptionValues = Object.keys(maxSlotsByOption);
    if (constrainedOptionValues.length === 0) {
      continue;
    }

    const { data: existingAnswers, error: answersError } = await supabase
      .from('registration_answers')
      .select('answer_text, answer_json, registrations!inner(status, user_id)')
      .eq('event_field_id', rawField.id)
      .neq('registrations.status', 'cancelled')
      .returns<Array<RegistrationAnswerRow>>();

    if (answersError) {
      console.error('Slot availability answer lookup error:', answersError);
      return sharedErrorResponse(corsHeaders, 500, 'Failed to compute slot usage');
    }

    const { data: existingPublicAnswers, error: publicAnswersError } = await supabase
      .from('public_registration_answers')
      .select('answer_text, answer_json, public_registrations!inner(status)')
      .eq('event_field_id', rawField.id)
      .neq('public_registrations.status', 'cancelled')
      .returns<Array<PublicRegistrationAnswerRow>>();

    if (publicAnswersError) {
      console.error('Public slot availability answer lookup error:', publicAnswersError);
      return sharedErrorResponse(corsHeaders, 500, 'Failed to compute slot usage');
    }

    const usageByOption = constrainedOptionValues.reduce<Record<string, number>>((acc, value) => {
      acc[value] = 0;
      return acc;
    }, {});

    const usageByOptionAndRole = constrainedOptionValues.reduce<
      Record<string, Record<string, number>>
    >((acc, optionValue) => {
      acc[optionValue] = {};
      return acc;
    }, {});

    const registrationUserIds = Array.from(
      new Set(
        (existingAnswers ?? [])
          .map((answer) => getRegistrationUserId(answer.registrations))
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    const userRoleMap = new Map<string, string | null>();
    if (registrationUserIds.length > 0) {
      const { data: usersWithRole, error: usersWithRoleError } = await supabase
        .from('users')
        .select('id, role')
        .in('id', registrationUserIds)
        .returns<UserRoleRow[]>();

      if (usersWithRoleError) {
        console.error('Slot availability role lookup error:', usersWithRoleError);
        return sharedErrorResponse(corsHeaders, 500, 'Failed to compute slot usage');
      }

      for (const user of usersWithRole ?? []) {
        userRoleMap.set(user.id, extractMemberRole(user.role));
      }
    }

    for (const answer of existingAnswers ?? []) {
      const usedOptions = extractSelectedOptionValuesFromStoredAnswer(rawField.field_type, {
        answer_text: answer.answer_text,
        answer_json: answer.answer_json,
      });

      const answerUserId = getRegistrationUserId(answer.registrations);
      const memberRole = answerUserId ? userRoleMap.get(answerUserId) : null;

      for (const optionValue of constrainedOptionValues) {
        if (usedOptions.includes(optionValue)) {
          const roleAllotments = roleAllotmentsByOption[optionValue] ?? {};
          const hasRoleAllotments = Object.keys(roleAllotments).length > 0;
          const wildcardCap = roleAllotments['*'];

          if (!hasRoleAllotments) {
            usageByOption[optionValue] = (usageByOption[optionValue] ?? 0) + 1;
            continue;
          }

          if (typeof wildcardCap === 'number') {
            usageByOption[optionValue] = (usageByOption[optionValue] ?? 0) + 1;
            usageByOptionAndRole[optionValue]['*'] =
              (usageByOptionAndRole[optionValue]['*'] ?? 0) + 1;
            continue;
          }

          if (!memberRole || roleAllotments[memberRole] === undefined) {
            continue;
          }

          usageByOption[optionValue] = (usageByOption[optionValue] ?? 0) + 1;
          usageByOptionAndRole[optionValue][memberRole] =
            (usageByOptionAndRole[optionValue][memberRole] ?? 0) + 1;
        }
      }
    }

    for (const answer of existingPublicAnswers ?? []) {
      const usedOptions = extractSelectedOptionValuesFromStoredAnswer(rawField.field_type, {
        answer_text: answer.answer_text,
        answer_json: answer.answer_json,
      });

      for (const optionValue of constrainedOptionValues) {
        if (usedOptions.includes(optionValue)) {
          const roleAllotments = roleAllotmentsByOption[optionValue] ?? {};
          const wildcardCap = roleAllotments['*'];

          if (Object.keys(roleAllotments).length > 0 && typeof wildcardCap !== 'number') {
            continue;
          }

          usageByOption[optionValue] = (usageByOption[optionValue] ?? 0) + 1;
          if (typeof wildcardCap === 'number') {
            usageByOptionAndRole[optionValue]['*'] =
              (usageByOptionAndRole[optionValue]['*'] ?? 0) + 1;
          }
        }
      }
    }

    const optionLabelByValue = new Map(
      (rawField.options ?? []).map((option) => [option.value, option.label] as const),
    );

    const options: SlotAvailabilityOption[] = constrainedOptionValues
      .map((optionValue) => {
        const allottedSlots = maxSlotsByOption[optionValue];
        if (typeof allottedSlots !== 'number' || allottedSlots <= 0) {
          return null;
        }

        const usedSlots = usageByOption[optionValue] ?? 0;
        const roleAllotments = roleAllotmentsByOption[optionValue] ?? {};
        const roleKeys = Object.keys(roleAllotments);
        const remainingSlotsByRole = roleKeys.reduce<Record<string, number>>((acc, role) => {
          const roleCap = roleAllotments[role] ?? 0;
          const usedSlotsForRole = usageByOptionAndRole[optionValue]?.[role] ?? 0;
          acc[role] = Math.max(0, roleCap - usedSlotsForRole);
          return acc;
        }, {});

        return {
          value: optionValue,
          label: optionLabelByValue.get(optionValue) ?? optionValue,
          allotted_slots: allottedSlots,
          used_slots: usedSlots,
          remaining_slots: Math.max(0, allottedSlots - usedSlots),
          ...(roleKeys.length > 0 ? { remaining_slots_by_role: remainingSlotsByRole } : {}),
        };
      })
      .filter((entry): entry is SlotAvailabilityOption => Boolean(entry));

    if (options.length === 0) {
      continue;
    }

    slotFields.push({
      field_id: rawField.id,
      field_key: rawField.field_key,
      field_label: rawField.label,
      options,
    });
  }

  return sharedSuccessResponse(corsHeaders, {
    event_id: eventId,
    fields: slotFields,
  });
});
