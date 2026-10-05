import {
  DYNAMIC_FIELD_TYPE_LABELS,
  dynamicFieldHasDateValidation,
  dynamicFieldHasMultiSelectValidation,
  dynamicFieldHasNumberValidation,
  dynamicFieldHasOptions,
  dynamicFieldHasRatingValidation,
  dynamicFieldHasTextValidation,
} from '@/lib/domain/dynamic-fields';

import type { AttendanceFieldType } from './types';

export const ATTENDANCE_FIELD_TYPE_LABELS: Record<AttendanceFieldType, string> =
  DYNAMIC_FIELD_TYPE_LABELS;

export function attendanceFieldTypeHasOptions(fieldType: AttendanceFieldType): boolean {
  return dynamicFieldHasOptions(fieldType);
}

export function attendanceFieldTypeHasTextValidation(fieldType: AttendanceFieldType): boolean {
  return dynamicFieldHasTextValidation(fieldType);
}

export function attendanceFieldTypeHasNumberValidation(fieldType: AttendanceFieldType): boolean {
  return dynamicFieldHasNumberValidation(fieldType);
}

export function attendanceFieldTypeHasRatingValidation(fieldType: AttendanceFieldType): boolean {
  return dynamicFieldHasRatingValidation(fieldType);
}

export function attendanceFieldTypeHasMultiSelectValidation(
  fieldType: AttendanceFieldType,
): boolean {
  return dynamicFieldHasMultiSelectValidation(fieldType);
}

export function attendanceFieldTypeHasDateValidation(fieldType: AttendanceFieldType): boolean {
  return dynamicFieldHasDateValidation(fieldType);
}
