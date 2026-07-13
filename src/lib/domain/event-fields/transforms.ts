import type { DynamicFieldAnswerPreview } from '@/lib/domain/events';

import type { EventFieldFormValues, EventFieldTypeEnum } from './schemas';
import type { AdminEventField, DynamicFieldResponseValues, PublicEventField } from './types';

export type { EventFieldFormValues } from './schemas';

type RoleAllotmentEntry = {
  role: string;
  alloted_slots: number;
};

type RoleAllotmentFormEntry = {
  role: string;
  alloted_slots: string;
};

type WeekdayString = '0' | '1' | '2' | '3' | '4' | '5' | '6';

const WILDCARD_ROLE = '*';

function normalizeRoleAllotmentFormEntries(
  entries: RoleAllotmentFormEntry[],
): RoleAllotmentFormEntry[] {
  const dedupedByRole = new Map<string, RoleAllotmentFormEntry>();

  for (const entry of entries) {
    const role = entry.role.trim();
    if (role.length === 0) {
      continue;
    }

    const parsedSlots = parseInt(entry.alloted_slots.trim(), 10);
    if (!Number.isFinite(parsedSlots) || parsedSlots <= 0) {
      continue;
    }

    const normalizedRole = role === WILDCARD_ROLE ? WILDCARD_ROLE : role.toLowerCase();
    if (normalizedRole === WILDCARD_ROLE) {
      dedupedByRole.clear();
      dedupedByRole.set(WILDCARD_ROLE, {
        role: WILDCARD_ROLE,
        alloted_slots: String(parsedSlots),
      });
      continue;
    }

    if (dedupedByRole.has(WILDCARD_ROLE)) {
      continue;
    }

    dedupedByRole.set(normalizedRole, {
      role,
      alloted_slots: String(parsedSlots),
    });
  }

  return Array.from(dedupedByRole.values());
}

function parseRoleAllotments(roleAllotments: RoleAllotmentFormEntry[]): RoleAllotmentEntry[] {
  return normalizeRoleAllotmentFormEntries(roleAllotments).map((entry) => ({
    role: entry.role,
    alloted_slots: parseInt(entry.alloted_slots, 10),
  }));
}

function formatRoleAllotments(allotments: unknown): RoleAllotmentFormEntry[] {
  if (Array.isArray(allotments)) {
    const parsedEntries = allotments
      .map((entry) => {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
          return null;
        }

        const role =
          typeof (entry as { role?: unknown }).role === 'string'
            ? (entry as { role: string }).role.trim()
            : '';
        const limit = (entry as { alloted_slots?: unknown }).alloted_slots;

        if (role.length === 0) {
          return null;
        }

        if (
          typeof limit === 'number' &&
          Number.isFinite(limit) &&
          Number.isInteger(limit) &&
          limit > 0
        ) {
          return { role, alloted_slots: String(limit) };
        }

        return null;
      })
      .filter((entry): entry is RoleAllotmentFormEntry => Boolean(entry));

    return normalizeRoleAllotmentFormEntries(parsedEntries);
  }

  // Backward compatibility for legacy role-keyed object shape.
  if (typeof allotments === 'object' && allotments !== null) {
    const parsedEntries = Object.entries(allotments as Record<string, unknown>)
      .map(([role, limit]) => {
        const trimmedRole = role.trim();
        if (trimmedRole.length === 0) {
          return null;
        }

        if (
          typeof limit === 'number' &&
          Number.isFinite(limit) &&
          Number.isInteger(limit) &&
          limit > 0
        ) {
          return { role: trimmedRole, alloted_slots: String(limit) };
        }

        return null;
      })
      .filter((entry): entry is RoleAllotmentFormEntry => Boolean(entry));

    return normalizeRoleAllotmentFormEntries(parsedEntries);
  }

  return [];
}

export const DEFAULT_FIELD_FORM_VALUES: EventFieldFormValues = {
  field_key: '',
  label: '',
  field_type: 'text',
  is_required: false,
  is_active: true,
  placeholder: '',
  help_text: '',
  options: [],
  val_min_length: '',
  val_max_length: '',
  val_pattern: '',
  val_min: '',
  val_max: '',
  val_min_selections: '',
  val_max_selections: '',
  val_min_date: '',
  val_max_date: '',
  val_allowed_weekdays: [],
};

function toWeekdayString(value: number): WeekdayString | null {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    return null;
  }

  return String(value) as WeekdayString;
}

/** Convert a saved AdminEventField to form default values for pre-filling the edit panel. */
export function fieldToFormValues(field: AdminEventField): EventFieldFormValues {
  const rules = field.validation_rules ?? {};
  const slotLimitsByOptionValue =
    typeof rules.max_slots === 'object' && rules.max_slots !== null ? rules.max_slots : {};
  const roleAllotmentsByOptionValue =
    typeof rules.max_slots_role_allotments === 'object' && rules.max_slots_role_allotments !== null
      ? rules.max_slots_role_allotments
      : {};
  return {
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type as EventFieldTypeEnum,
    is_required: field.is_required,
    is_active: field.is_active,
    placeholder: field.placeholder ?? '',
    help_text: field.help_text ?? '',
    options: (field.options ?? []).map((option) => ({
      label: option.label,
      value: option.value,
      toggle_label: option.toggle_label ?? '',
      ...(option.toggle_default !== undefined ? { toggle_default: option.toggle_default } : {}),
      max_slots:
        typeof slotLimitsByOptionValue[option.value] === 'number'
          ? String(slotLimitsByOptionValue[option.value])
          : '',
      role_allotments: formatRoleAllotments(roleAllotmentsByOptionValue[option.value]),
    })),
    val_min_length: rules.min_length != null ? String(rules.min_length) : '',
    val_max_length: rules.max_length != null ? String(rules.max_length) : '',
    val_pattern: typeof rules.pattern === 'string' ? rules.pattern : '',
    val_min: rules.min != null ? String(rules.min) : '',
    val_max: rules.max != null ? String(rules.max) : '',
    val_min_selections: rules.min_selections != null ? String(rules.min_selections) : '',
    val_max_selections: rules.max_selections != null ? String(rules.max_selections) : '',
    val_min_date: typeof rules.min_date === 'string' ? rules.min_date : '',
    val_max_date: typeof rules.max_date === 'string' ? rules.max_date : '',
    val_allowed_weekdays: Array.isArray(rules.allowed_weekdays)
      ? rules.allowed_weekdays
          .map((weekday) => toWeekdayString(weekday))
          .filter((weekday): weekday is WeekdayString => weekday !== null)
      : [],
  };
}

/** Convert flat form values to a typed validation_rules object. */
export function toValidationRules(values: EventFieldFormValues): Record<string, unknown> {
  const rules: Record<string, unknown> = {};
  if (values.val_min_length !== '') rules.min_length = parseInt(values.val_min_length, 10);
  if (values.val_max_length !== '') rules.max_length = parseInt(values.val_max_length, 10);
  if (values.val_pattern !== '') rules.pattern = values.val_pattern;
  if (values.val_min !== '') rules.min = parseFloat(values.val_min);
  if (values.val_max !== '') rules.max = parseFloat(values.val_max);
  if (values.val_min_selections !== '') {
    rules.min_selections = parseInt(values.val_min_selections, 10);
  }
  if (values.val_max_selections !== '') {
    rules.max_selections = parseInt(values.val_max_selections, 10);
  }
  if (values.val_min_date !== '') rules.min_date = values.val_min_date;
  if (values.val_max_date !== '') rules.max_date = values.val_max_date;

  const selectedWeekdays = values.val_allowed_weekdays ?? [];
  if (selectedWeekdays.length > 0) {
    const allowedWeekdays = selectedWeekdays
      .map((weekday) => Number.parseInt(weekday, 10))
      .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
      .filter((weekday, index, valuesList) => valuesList.indexOf(weekday) === index)
      .sort((a, b) => a - b);

    if (allowedWeekdays.length > 0) {
      rules.allowed_weekdays = allowedWeekdays;
    }
  }

  const maxSlots = values.options.reduce<Record<string, number>>((acc, option) => {
    const trimmedSlotCount = option.max_slots.trim();
    const optionValue = option.value.trim();

    // Empty slot values mean unlimited/open capacity for that option.
    if (trimmedSlotCount.length === 0 || optionValue.length === 0) {
      return acc;
    }

    const parsed = parseInt(trimmedSlotCount, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      acc[optionValue] = parsed;
    }

    return acc;
  }, {});

  const maxSlotsRoleAllotments = values.options.reduce<Record<string, RoleAllotmentEntry[]>>(
    (acc, option) => {
      const optionValue = option.value.trim();
      if (optionValue.length === 0) {
        return acc;
      }

      const parsedRoleAllotments = parseRoleAllotments(option.role_allotments);
      if (parsedRoleAllotments.length > 0) {
        acc[optionValue] = parsedRoleAllotments;
      }

      return acc;
    },
    {},
  );

  if (Object.keys(maxSlotsRoleAllotments).length > 0) {
    // If role allotments are configured, derive option max slots from role totals.
    for (const [optionValue, roleAllotments] of Object.entries(maxSlotsRoleAllotments)) {
      const derivedSlots = roleAllotments.reduce((sum, entry) => sum + entry.alloted_slots, 0);
      if (derivedSlots > 0) {
        maxSlots[optionValue] = derivedSlots;
      }
    }

    rules.max_slots_role_allotments = maxSlotsRoleAllotments;
  }

  if (Object.keys(maxSlots).length > 0) {
    rules.max_slots = maxSlots;
  }

  return rules;
}

export function normalizeDynamicFieldAnswersForPreview(
  fields: PublicEventField[],
  values: DynamicFieldResponseValues,
): DynamicFieldAnswerPreview[] {
  return fields.map((field) => ({
    event_field_id: field.id,
    field_key: field.field_key,
    field_type: field.field_type,
    value: values[field.field_key],
  }));
}

export function createDynamicFieldDefaultValues(
  fields: PublicEventField[],
): DynamicFieldResponseValues {
  return fields.reduce<DynamicFieldResponseValues>((defaults, field) => {
    if (field.field_type === 'checkbox' || field.field_type === 'boolean') {
      defaults[field.field_key] = false;
      return defaults;
    }

    if (field.field_type === 'multi_select') {
      defaults[field.field_key] = [];
      return defaults;
    }

    if (field.field_type === 'multi_select_toggle') {
      defaults[field.field_key] = {};
      return defaults;
    }

    defaults[field.field_key] = '';
    return defaults;
  }, {});
}
