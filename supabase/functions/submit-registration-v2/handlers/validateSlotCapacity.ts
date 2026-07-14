import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';
import {
  buildFieldOptionCapacityWorkItems,
  buildFullCapacityValidationErrors,
  createOptionUsageCounter,
  extractSelectedOptionValuesFromStoredAnswer,
  incrementOptionUsageFromSelection,
  normalizePrimaryRoleValue,
} from '@/shared/validation.ts';
import type { EventFieldWithValidation, FieldValidationError } from '@/shared/validation.ts';

interface RegistrationAnswerRow {
  answer_text: string | null;
  registration_id: string;
  registrations: {
    status: string;
    user_id: string;
  } | null;
}

interface UserRoleRow {
  id: string;
  role: string;
}

export interface ValidateSlotCapacityParams {
  fields: EventFieldWithValidation[];
  responses: Record<string, unknown>;
  registrationId: string;
  isNew: boolean;
  memberRole: string | null;
}

export async function validateSlotCapacity(
  supabase: SupabaseClient,
  params: ValidateSlotCapacityParams,
): Promise<HandlerResult<void>> {
  const { fields, responses, registrationId, isNew, memberRole } = params;

  const capacityWorkItems = buildFieldOptionCapacityWorkItems(fields, responses);
  const errors: FieldValidationError[] = [];

  for (const workItem of capacityWorkItems) {
    const { field, fieldKey, maxSlotsByOption, roleAllotmentsByOption, constrainedSelections } =
      workItem;

    let answerQuery = supabase
      .from('registration_answers')
      .select('answer_text, registration_id, registrations!inner(status,user_id)')
      .eq('event_field_id', field.id)
      .neq('registrations.status', 'cancelled');

    if (!isNew) {
      answerQuery = answerQuery.neq('registration_id', registrationId);
    }

    const { data: existingAnswers, error: slotLookupError } =
      await answerQuery.returns<RegistrationAnswerRow[]>();

    if (slotLookupError) {
      return {
        ok: false,
        errorCode: 'SLOT_LOOKUP_FAILED',
        message: 'Failed to process registration',
        httpStatus: 500,
      };
    }

    const registrationUserIds = Array.from(
      new Set(
        (existingAnswers ?? [])
          .map((answer) => answer.registrations?.user_id)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    const userRoleMap = new Map<string, string | null>();

    if (registrationUserIds.length > 0) {
      const { data: usersWithRole, error: roleLookupError } = await supabase
        .from('users')
        .select('id, role')
        .in('id', registrationUserIds)
        .returns<UserRoleRow[]>();

      if (roleLookupError) {
        return {
          ok: false,
          errorCode: 'ROLE_LOOKUP_FAILED',
          message: 'Failed to process registration',
          httpStatus: 500,
        };
      }

      for (const user of usersWithRole ?? []) {
        userRoleMap.set(user.id, normalizePrimaryRoleValue(user.role));
      }
    }

    const usageByOption = createOptionUsageCounter(constrainedSelections);
    const usageByOptionAndRole = constrainedSelections.reduce<
      Record<string, Record<string, number>>
    >((acc, option) => {
      acc[option] = {};
      return acc;
    }, {});

    for (const answer of existingAnswers ?? []) {
      const usedOptions = extractSelectedOptionValuesFromStoredAnswer(field.field_type, {
        answer_text: answer.answer_text,
      });

      for (const option of constrainedSelections) {
        if (!usedOptions.includes(option)) continue;

        const roleAllotmentsForOption = roleAllotmentsByOption[option] ?? {};
        const hasRoleAllotments = Object.keys(roleAllotmentsForOption).length > 0;
        const wildcardCap = roleAllotmentsForOption['*'];

        if (!hasRoleAllotments) {
          incrementOptionUsageFromSelection(usageByOption, [option], usedOptions);
          continue;
        }

        if (typeof wildcardCap === 'number') {
          incrementOptionUsageFromSelection(usageByOption, [option], usedOptions);
          const perRoleUsage = usageByOptionAndRole[option] ?? {};
          perRoleUsage['*'] = (perRoleUsage['*'] ?? 0) + 1;
          usageByOptionAndRole[option] = perRoleUsage;
          continue;
        }

        const answerUserId = answer.registrations?.user_id;
        const existingRole = answerUserId ? userRoleMap.get(answerUserId) : null;

        if (!existingRole || roleAllotmentsForOption[existingRole] === undefined) {
          continue;
        }

        incrementOptionUsageFromSelection(usageByOption, [option], usedOptions);
        const perRoleUsage = usageByOptionAndRole[option] ?? {};
        perRoleUsage[existingRole] = (perRoleUsage[existingRole] ?? 0) + 1;
        usageByOptionAndRole[option] = perRoleUsage;
      }
    }

    const optionsEligibleForGlobalCap: string[] = [];

    for (const option of constrainedSelections) {
      const roleAllotmentsForOption = roleAllotmentsByOption[option] ?? {};
      const hasRoleAllotments = Object.keys(roleAllotmentsForOption).length > 0;
      const wildcardCap = roleAllotmentsForOption['*'];
      const roleCapForMember = memberRole ? roleAllotmentsForOption[memberRole] : undefined;

      if (hasRoleAllotments) {
        if (typeof wildcardCap === 'number') {
          const usedWildcardSlots = usageByOptionAndRole[option]?.['*'] ?? 0;
          if (usedWildcardSlots >= wildcardCap) {
            const optionLabel = field.options.find((e) => e.value === option)?.label ?? option;
            errors.push({
              fieldKey,
              message: `${field.label} option "${optionLabel}" already reached the allotted slots for all roles.`,
            });
          }
          continue;
        }

        if (roleCapForMember === undefined) {
          continue;
        }

        const usedSlotsForRole = memberRole ? (usageByOptionAndRole[option]?.[memberRole] ?? 0) : 0;

        if (typeof roleCapForMember === 'number' && usedSlotsForRole >= roleCapForMember) {
          const optionLabel = field.options.find((e) => e.value === option)?.label ?? option;
          errors.push({
            fieldKey,
            message: `${field.label} option "${optionLabel}" already reached the allotted slots for role "${memberRole}".`,
          });
          continue;
        }
      }

      optionsEligibleForGlobalCap.push(option);
    }

    errors.push(
      ...buildFullCapacityValidationErrors({
        fieldKey,
        fieldLabel: field.label,
        optionValues: optionsEligibleForGlobalCap,
        options: field.options,
        maxSlotsByOption,
        usageByOption,
      }),
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errorCode: 'VALIDATION_FAILED',
      message: 'Validation failed',
      httpStatus: 200,
      errors,
    };
  }

  return { ok: true, data: undefined };
}
