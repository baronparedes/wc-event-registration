import type { FieldValidationError } from './validation.ts';

export interface UniquenessCandidateField {
  field_key: string;
  label: string;
  field_type: string;
  validation_rules: unknown;
}

export interface UniquenessComponentField {
  field_key: string;
  label: string;
  field_type: string;
}

function isUniquenessComponentField(field: UniquenessCandidateField): boolean {
  if (!field.validation_rules || typeof field.validation_rules !== 'object') {
    return false;
  }

  const rules = field.validation_rules as Record<string, unknown>;
  return rules.unique_key_component === true;
}

export function selectUniquenessComponentFields(
  fields: UniquenessCandidateField[],
): UniquenessComponentField[] {
  return fields
    .filter((field) => isUniquenessComponentField(field))
    .map((field) => ({
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type,
    }));
}

function normalizeUniquenessValue(fieldType: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (fieldType === 'multi_select') {
    const values = Array.isArray(value) ? value : [value];
    const normalized = values
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .sort();
    return normalized.length > 0 ? normalized.join(',') : null;
  }

  if (fieldType === 'multi_select_toggle') {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const selected = Object.entries(value as Record<string, unknown>)
      .filter(([, selectedValue]) => Boolean(selectedValue))
      .map(([option]) => option.trim())
      .filter(Boolean)
      .sort();

    return selected.length > 0 ? selected.join(',') : null;
  }

  if (fieldType === 'date' || fieldType === 'datetime') {
    const text = String(value).trim();
    return text.length > 0 ? text.slice(0, 10) : null;
  }

  if (fieldType === 'boolean') {
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return 'true';
    }

    if (value === false || value === 'false' || value === 0 || value === '0') {
      return 'false';
    }
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function encodeScopeComponent(value: string): string {
  return encodeURIComponent(value);
}

export function resolveCompoundScopeKey(
  responses: Record<string, unknown>,
  uniquenessFields: UniquenessComponentField[],
): { scopeKey: string | null; errors: FieldValidationError[] } {
  if (uniquenessFields.length === 0) {
    return { scopeKey: null, errors: [] };
  }

  const errors: FieldValidationError[] = [];
  const parts: string[] = [];

  for (const field of uniquenessFields) {
    const normalizedValue = normalizeUniquenessValue(field.field_type, responses[field.field_key]);

    if (!normalizedValue) {
      errors.push({
        fieldKey: field.field_key,
        message: `${field.label} is required for duplicate matching.`,
      });
      continue;
    }

    parts.push(`${field.field_key}=${encodeScopeComponent(normalizedValue)}`);
  }

  if (errors.length > 0) {
    return { scopeKey: null, errors };
  }

  return { scopeKey: `compound:${parts.join('|')}`, errors: [] };
}
