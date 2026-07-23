import { z } from 'zod';

import type {
  EventFieldConfigValidationResult,
  PublicEventField,
  PublicEventFieldOption,
  PublicEventFieldRow,
  PublicEventFieldValidationRules,
} from './types';

const eventFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'multi_select_toggle',
  'date',
  'datetime',
  'boolean',
  'color_picker',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFieldOptions(field: PublicEventFieldRow): {
  options: PublicEventFieldOption[];
  issue: string | null;
} {
  const requiresOptions =
    field.field_type === 'select' ||
    field.field_type === 'radio' ||
    field.field_type === 'multi_select' ||
    field.field_type === 'multi_select_toggle';

  if (!Array.isArray(field.options)) {
    return {
      options: [],
      issue: requiresOptions ? `Field "${field.field_key}" must define options as an array.` : null,
    };
  }

  const normalized = field.options
    .map((entry) => {
      if (typeof entry === 'string') {
        const value = entry.trim();
        if (!value) {
          return null;
        }
        return { label: value, value };
      }

      if (!isRecord(entry)) {
        return null;
      }

      const rawLabel = typeof entry.label === 'string' ? entry.label.trim() : '';
      const rawValue = typeof entry.value === 'string' ? entry.value.trim() : '';
      const rawToggleLabel =
        typeof entry.toggle_label === 'string' ? entry.toggle_label.trim() : '';
      const rawToggleDefault =
        typeof entry.toggle_default === 'boolean' ? entry.toggle_default : undefined;

      const value = rawValue || rawLabel;
      const label = rawLabel || rawValue;

      if (!label || !value) {
        return null;
      }

      return {
        label,
        value,
        ...(rawToggleLabel ? { toggle_label: rawToggleLabel } : {}),
        ...(rawToggleDefault !== undefined ? { toggle_default: rawToggleDefault } : {}),
      };
    })
    .filter((entry): entry is PublicEventFieldOption => Boolean(entry));

  const deduped = normalized.filter(
    (option, index) =>
      normalized.findIndex((candidate) => candidate.value === option.value) === index,
  );

  if (field.field_type === 'multi_select_toggle') {
    const missingToggleLabel = deduped.find(
      (option) => !option.toggle_label || option.toggle_label.trim().length === 0,
    );

    if (missingToggleLabel) {
      return {
        options: [],
        issue: `Field "${field.field_key}" requires a toggle label for each option.`,
      };
    }
  }

  if (requiresOptions && deduped.length === 0) {
    return {
      options: [],
      issue: `Field "${field.field_key}" must include at least one valid option.`,
    };
  }

  return { options: deduped, issue: null };
}

function parseFieldValidationRules(field: PublicEventFieldRow): PublicEventFieldValidationRules {
  if (!isRecord(field.validation_rules)) {
    return {};
  }

  const rules: PublicEventFieldValidationRules = {};

  const minLength = field.validation_rules.min_length;
  if (typeof minLength === 'number' && Number.isFinite(minLength) && minLength >= 0) {
    rules.min_length = minLength;
  }

  const maxLength = field.validation_rules.max_length;
  if (typeof maxLength === 'number' && Number.isFinite(maxLength) && maxLength >= 0) {
    rules.max_length = maxLength;
  }

  const pattern = field.validation_rules.pattern;
  if (typeof pattern === 'string' && pattern.trim().length > 0) {
    rules.pattern = pattern;
  }

  const min = field.validation_rules.min;
  if (typeof min === 'number' && Number.isFinite(min)) {
    rules.min = min;
  }

  const max = field.validation_rules.max;
  if (typeof max === 'number' && Number.isFinite(max)) {
    rules.max = max;
  }

  const minSelections = field.validation_rules.min_selections;
  if (
    typeof minSelections === 'number' &&
    Number.isFinite(minSelections) &&
    Number.isInteger(minSelections) &&
    minSelections >= 0
  ) {
    rules.min_selections = minSelections;
  }

  const maxSelections = field.validation_rules.max_selections;
  if (
    typeof maxSelections === 'number' &&
    Number.isFinite(maxSelections) &&
    Number.isInteger(maxSelections) &&
    maxSelections >= 0
  ) {
    rules.max_selections = maxSelections;
  }

  const maxSlots = field.validation_rules.max_slots;
  if (isRecord(maxSlots)) {
    const parsedMaxSlots = Object.entries(maxSlots).reduce<Record<string, number>>(
      (acc, [optionValue, rawMaxSlots]) => {
        if (
          typeof rawMaxSlots === 'number' &&
          Number.isFinite(rawMaxSlots) &&
          Number.isInteger(rawMaxSlots) &&
          rawMaxSlots > 0
        ) {
          acc[optionValue] = rawMaxSlots;
        }

        return acc;
      },
      {},
    );

    if (Object.keys(parsedMaxSlots).length > 0) {
      rules.max_slots = parsedMaxSlots;
    }
  }

  const maxSlotsRoleAllotments = field.validation_rules.max_slots_role_allotments;
  if (isRecord(maxSlotsRoleAllotments)) {
    const normalizeRoleAllotments = (
      entries: Array<{ role: string; alloted_slots: number }>,
    ): Array<{ role: string; alloted_slots: number }> => {
      const dedupedEntries = new Map<string, { role: string; alloted_slots: number }>();

      for (const entry of entries) {
        const role = entry.role.trim();
        if (role.length === 0) {
          continue;
        }

        const normalizedRole = role === '*' ? '*' : role.toLowerCase();
        if (normalizedRole === '*') {
          dedupedEntries.clear();
          dedupedEntries.set('*', { role: '*', alloted_slots: entry.alloted_slots });
          continue;
        }

        if (dedupedEntries.has('*')) {
          continue;
        }

        dedupedEntries.set(normalizedRole, { role, alloted_slots: entry.alloted_slots });
      }

      return Array.from(dedupedEntries.values());
    };

    const parsedRoleAllotments = Object.entries(maxSlotsRoleAllotments).reduce<
      Record<string, Array<{ role: string; alloted_slots: number }>>
    >((acc, [optionValue, rawEntries]) => {
      if (Array.isArray(rawEntries)) {
        const normalizedEntries: Array<{ role: string; alloted_slots: number }> = [];

        for (const entry of rawEntries) {
          if (!isRecord(entry)) {
            continue;
          }

          const role = typeof entry.role === 'string' ? entry.role.trim() : '';
          if (role.length === 0) {
            continue;
          }

          const rawLimit = entry.alloted_slots;
          if (
            typeof rawLimit === 'number' &&
            Number.isFinite(rawLimit) &&
            Number.isInteger(rawLimit) &&
            rawLimit > 0
          ) {
            normalizedEntries.push({ role, alloted_slots: rawLimit });
          }
        }

        const sanitizedEntries = normalizeRoleAllotments(normalizedEntries);
        if (sanitizedEntries.length > 0) {
          acc[optionValue] = sanitizedEntries;
        }

        return acc;
      }

      // Backward compatibility for legacy role-keyed object shape.
      if (!isRecord(rawEntries)) {
        return acc;
      }

      const normalizedEntries: Array<{ role: string; alloted_slots: number }> = [];
      for (const [roleKey, rawLimit] of Object.entries(rawEntries)) {
        const role = roleKey.trim();
        if (role.length === 0) {
          continue;
        }

        if (
          typeof rawLimit === 'number' &&
          Number.isFinite(rawLimit) &&
          Number.isInteger(rawLimit) &&
          rawLimit > 0
        ) {
          normalizedEntries.push({ role, alloted_slots: rawLimit });
        }
      }

      const sanitizedEntries = normalizeRoleAllotments(normalizedEntries);
      if (sanitizedEntries.length > 0) {
        acc[optionValue] = sanitizedEntries;
      }

      return acc;
    }, {});

    if (Object.keys(parsedRoleAllotments).length > 0) {
      rules.max_slots_role_allotments = parsedRoleAllotments;
    }
  }

  const minDate = field.validation_rules.min_date;
  if (typeof minDate === 'string' && minDate.trim().length > 0) {
    rules.min_date = minDate;
  }

  const maxDate = field.validation_rules.max_date;
  if (typeof maxDate === 'string' && maxDate.trim().length > 0) {
    rules.max_date = maxDate;
  }

  const maxPastDays = field.validation_rules.max_past_days;
  if (
    typeof maxPastDays === 'number' &&
    Number.isFinite(maxPastDays) &&
    Number.isInteger(maxPastDays) &&
    maxPastDays >= 0
  ) {
    rules.max_past_days = maxPastDays;
  }

  const allowedWeekdays = field.validation_rules.allowed_weekdays;
  if (Array.isArray(allowedWeekdays)) {
    const parsedWeekdays = allowedWeekdays
      .filter((weekday): weekday is number => typeof weekday === 'number')
      .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
      .filter((weekday, index, values) => values.indexOf(weekday) === index)
      .sort((a, b) => a - b);

    if (parsedWeekdays.length > 0) {
      rules.allowed_weekdays = parsedWeekdays;
    }
  }

  const uniqueKeyComponent = field.validation_rules.unique_key_component;
  if (uniqueKeyComponent === true) {
    rules.unique_key_component = true;
  }

  return rules;
}

export function validatePublicEventFieldConfig(
  rows: PublicEventFieldRow[],
): EventFieldConfigValidationResult {
  const issues: string[] = [];
  const validFields: PublicEventField[] = [];

  rows.forEach((row) => {
    const parsedType = eventFieldTypeSchema.safeParse(row.field_type);
    if (!parsedType.success) {
      issues.push(`Field "${row.field_key}" has unsupported type "${String(row.field_type)}".`);
      return;
    }

    const parsedOptions = parseFieldOptions({ ...row, field_type: parsedType.data });
    if (parsedOptions.issue) {
      issues.push(parsedOptions.issue);
      return;
    }

    validFields.push({
      ...row,
      field_type: parsedType.data,
      options: parsedOptions.options,
      validation_rules: parseFieldValidationRules(row),
    });
  });

  return { validFields, issues };
}
