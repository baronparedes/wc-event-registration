export type FieldVisibilityRule = {
  depends_on_field_key: string;
  equals_value: string;
};

export type FieldWithVisibility = {
  field_key: string;
  validation_rules?: {
    visibility_rule?: FieldVisibilityRule | null;
    [key: string]: unknown;
  } | null;
};

/**
 * Checks if a field is visible based on its visibility dependency rule and current form values.
 *
 * Comparisons are case-insensitive and whitespace-trimmed.
 * Supports recursive parent visibility checking (chained dependencies) with cycle prevention.
 */
export function isFieldVisible<T extends FieldWithVisibility>(
  field: T,
  allFields: T[],
  formValues: Record<string, unknown>,
  visitedKeys = new Set<string>(),
): boolean {
  if (visitedKeys.has(field.field_key)) {
    // Cycle detected! Prevent infinite loops.
    return false;
  }
  visitedKeys.add(field.field_key);

  const rule = field.validation_rules?.visibility_rule;
  if (!rule || !rule.depends_on_field_key || rule.depends_on_field_key.trim().length === 0) {
    return true;
  }

  const parentKey = rule.depends_on_field_key.trim();
  const parentField = allFields.find((f) => f.field_key === parentKey);

  // If parent field exists in the fields list, ensure the parent field itself is visible
  if (parentField && !isFieldVisible(parentField, allFields, formValues, new Set(visitedKeys))) {
    return false;
  }

  const parentValue = formValues[parentKey];
  const targetValue = rule.equals_value.trim().toLowerCase();

  if (parentValue === undefined || parentValue === null) {
    return targetValue === '';
  }

  if (Array.isArray(parentValue)) {
    return parentValue.some((item) => String(item).trim().toLowerCase() === targetValue);
  }

  if (typeof parentValue === 'object') {
    return Object.entries(parentValue as Record<string, unknown>).some(([key, val]) => {
      if (key.trim().toLowerCase() === targetValue) {
        return val !== false && val !== null && val !== undefined;
      }
      return false;
    });
  }

  return String(parentValue).trim().toLowerCase() === targetValue;
}

/**
 * Returns a new response values object containing only values for fields that are currently visible.
 */
export function filterVisibleFieldValues<T extends FieldWithVisibility>(
  fields: T[],
  formValues: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const field of fields) {
    if (isFieldVisible(field, fields, formValues)) {
      if (field.field_key in formValues) {
        cleaned[field.field_key] = formValues[field.field_key];
      }
    }
  }

  return cleaned;
}
