import {
  DYNAMIC_FIELD_TYPE_COLORS,
  DYNAMIC_FIELD_TYPE_LABELS,
  dynamicFieldHasDateValidation,
  dynamicFieldHasMultiSelectValidation,
  dynamicFieldHasNumberValidation,
  dynamicFieldHasOptions,
  dynamicFieldHasRatingValidation,
  dynamicFieldHasTextValidation,
  dynamicFieldHasValidation,
} from '@/lib/domain/dynamic-fields';

import type { EventFieldTypeEnum } from './schemas';

/** User-facing labels for each field type. */
export const FIELD_TYPE_LABELS: Record<EventFieldTypeEnum, string> = DYNAMIC_FIELD_TYPE_LABELS;

/** Badge color classes for each field type across admin lists. */
export const FIELD_TYPE_COLORS: Record<string, string> = DYNAMIC_FIELD_TYPE_COLORS;

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
  return dynamicFieldHasOptions(ft);
}

/** Whether a field type supports text-based validation rules. */
export function fieldTypeHasTextValidation(ft: EventFieldTypeEnum): boolean {
  return dynamicFieldHasTextValidation(ft);
}

/** Whether a field type supports numeric validation rules. */
export function fieldTypeHasNumberValidation(ft: EventFieldTypeEnum): boolean {
  return dynamicFieldHasNumberValidation(ft);
}

/** Whether a field type supports rating scale validation rules. */
export function fieldTypeHasRatingValidation(ft: EventFieldTypeEnum): boolean {
  return dynamicFieldHasRatingValidation(ft);
}

/** Whether a field type supports selection count validation. */
export function fieldTypeHasMultiSelectValidation(ft: EventFieldTypeEnum): boolean {
  return dynamicFieldHasMultiSelectValidation(ft);
}

/** Whether a field type supports date range validation. */
export function fieldTypeHasDateValidation(ft: EventFieldTypeEnum): boolean {
  return dynamicFieldHasDateValidation(ft);
}

/** Whether a field type has any configurable validation rules. */
export function fieldTypeHasValidation(ft: EventFieldTypeEnum): boolean {
  return dynamicFieldHasValidation(ft);
}
