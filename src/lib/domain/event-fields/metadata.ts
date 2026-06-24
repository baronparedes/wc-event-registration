import type { EventFieldTypeEnum } from './schemas'

/** User-facing labels for each field type. */
export const FIELD_TYPE_LABELS: Record<EventFieldTypeEnum, string> = {
  text: 'Single Line Text',
  textarea: 'Multi-line Text',
  number: 'Number',
  email: 'Email Address',
  phone: 'Phone Number',
  select: 'Dropdown List',
  radio: 'Radio Buttons',
  checkbox: 'Checkbox',
  multi_select: 'Checkboxes (Multiple)',
  date: 'Date',
  datetime: 'Date & Time',
  boolean: 'Yes / No Toggle',
}

/**
 * Fields that can be updated on published events.
 * Structural changes (type, required, options, rules) are blocked.
 */
export const PUBLISHED_EDITABLE_FIELDS = ['label', 'placeholder', 'help_text'] as const
export type PublishedEditableField = (typeof PUBLISHED_EDITABLE_FIELDS)[number]

/** Whether a field type uses an options list (select/radio/multi_select). */
export function fieldTypeHasOptions(ft: EventFieldTypeEnum): boolean {
  return ft === 'select' || ft === 'radio' || ft === 'multi_select'
}

/** Whether a field type supports text-based validation rules. */
export function fieldTypeHasTextValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'text' || ft === 'textarea' || ft === 'email' || ft === 'phone'
}

/** Whether a field type supports numeric validation rules. */
export function fieldTypeHasNumberValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'number'
}

/** Whether a field type supports selection count validation. */
export function fieldTypeHasMultiSelectValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'multi_select'
}

/** Whether a field type supports date range validation. */
export function fieldTypeHasDateValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'date' || ft === 'datetime'
}

/** Whether a field type has any configurable validation rules. */
export function fieldTypeHasValidation(ft: EventFieldTypeEnum): boolean {
  return (
    fieldTypeHasTextValidation(ft) ||
    fieldTypeHasNumberValidation(ft) ||
    fieldTypeHasMultiSelectValidation(ft) ||
    fieldTypeHasDateValidation(ft)
  )
}
