import type { EventFieldTypeEnum } from './schemas';

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
  multi_select_toggle: 'Checkboxes + Yes/No',
  date: 'Date',
  datetime: 'Date & Time',
  boolean: 'Yes / No Toggle',
  color_picker: 'Color Picker',
  rating: 'Rating',
};

/** Badge color classes for each field type across admin lists. */
export const FIELD_TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800',
  textarea: 'bg-blue-100 text-blue-800',
  number: 'bg-purple-100 text-purple-800',
  email: 'bg-indigo-100 text-indigo-800',
  phone: 'bg-indigo-100 text-indigo-800',
  select: 'bg-green-100 text-green-800',
  radio: 'bg-green-100 text-green-800',
  checkbox: 'bg-amber-100 text-amber-800',
  multi_select: 'bg-green-100 text-green-800',
  multi_select_toggle: 'bg-green-100 text-green-800',
  date: 'bg-rose-100 text-rose-800',
  datetime: 'bg-rose-100 text-rose-800',
  boolean: 'bg-amber-100 text-amber-800',
  color_picker: 'bg-purple-100 text-purple-800',
  rating: 'bg-amber-100 text-amber-800',
};

/** User-facing labels for each field applicability scope. */
export const EVENT_FIELD_APPLICABILITY_LABELS: Record<'both' | 'members' | 'guests', string> = {
  both: 'Members + Guests',
  members: 'Members only',
  guests: 'Guests only',
};

/**
 * Fields that can be updated on published events.
 * Structural changes (type, required, options, rules) are blocked.
 */
export const PUBLISHED_EDITABLE_FIELDS = ['label', 'placeholder', 'help_text'] as const;
export type PublishedEditableField = (typeof PUBLISHED_EDITABLE_FIELDS)[number];

/** Whether a field type uses an options list (select/radio/multi_select). */
export function fieldTypeHasOptions(ft: EventFieldTypeEnum): boolean {
  return ft === 'select' || ft === 'radio' || ft === 'multi_select' || ft === 'multi_select_toggle';
}

/** Whether a field type supports text-based validation rules. */
export function fieldTypeHasTextValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'text' || ft === 'textarea' || ft === 'email' || ft === 'phone';
}

/** Whether a field type supports numeric validation rules. */
export function fieldTypeHasNumberValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'number';
}

/** Whether a field type supports rating scale validation rules. */
export function fieldTypeHasRatingValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'rating';
}

/** Whether a field type supports selection count validation. */
export function fieldTypeHasMultiSelectValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'multi_select' || ft === 'multi_select_toggle';
}

/** Whether a field type supports date range validation. */
export function fieldTypeHasDateValidation(ft: EventFieldTypeEnum): boolean {
  return ft === 'date' || ft === 'datetime';
}

/** Whether a field type has any configurable validation rules. */
export function fieldTypeHasValidation(ft: EventFieldTypeEnum): boolean {
  return (
    fieldTypeHasTextValidation(ft) ||
    fieldTypeHasNumberValidation(ft) ||
    fieldTypeHasRatingValidation(ft) ||
    fieldTypeHasMultiSelectValidation(ft) ||
    fieldTypeHasDateValidation(ft)
  );
}
