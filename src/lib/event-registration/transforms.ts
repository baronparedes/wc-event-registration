import type {
  DynamicFieldAnswerPreview,
  DynamicFieldResponseValues,
  PublicEventField,
} from './types'

export function normalizeDynamicFieldAnswersForPreview(
  fields: PublicEventField[],
  values: DynamicFieldResponseValues,
): DynamicFieldAnswerPreview[] {
  return fields.map((field) => ({
    event_field_id: field.id,
    field_key: field.field_key,
    field_type: field.field_type,
    value: values[field.field_key],
  }))
}
