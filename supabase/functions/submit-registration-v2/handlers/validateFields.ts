import type { HandlerResult } from '@/shared/handler.ts';
import type { EventFieldWithValidation, FieldValidationError } from '@/shared/validation.ts';
import { isFieldVisible, validateFieldValue } from '@/shared/validation.ts';

export function validateFields(
  fields: EventFieldWithValidation[],
  responses: Record<string, unknown>,
): HandlerResult<void> {
  const fieldMap = new Map(fields.map((f) => [f.field_key, f]));
  const errors: FieldValidationError[] = [];

  for (const [fieldKey, value] of Object.entries(responses)) {
    const field = fieldMap.get(fieldKey);
    if (!field) continue;

    if (!isFieldVisible(field, fields, responses)) {
      continue;
    }

    const error = validateFieldValue(fieldKey, value, field, fields, responses);
    if (error) {
      errors.push(error);
    }
  }

  for (const [fieldKey, field] of fieldMap) {
    if (
      field.is_required &&
      isFieldVisible(field, fields, responses) &&
      !(fieldKey in responses)
    ) {
      errors.push({ fieldKey, message: `${field.label} is required.` });
    }
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
