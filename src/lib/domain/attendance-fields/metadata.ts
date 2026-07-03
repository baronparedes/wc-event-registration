import type { AttendanceFieldType } from './types';

export const ATTENDANCE_FIELD_TYPE_LABELS: Record<AttendanceFieldType, string> = {
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
};

export function attendanceFieldTypeHasOptions(fieldType: AttendanceFieldType): boolean {
  return (
    fieldType === 'select' ||
    fieldType === 'radio' ||
    fieldType === 'multi_select' ||
    fieldType === 'multi_select_toggle'
  );
}

export function attendanceFieldTypeHasTextValidation(fieldType: AttendanceFieldType): boolean {
  return (
    fieldType === 'text' ||
    fieldType === 'textarea' ||
    fieldType === 'email' ||
    fieldType === 'phone'
  );
}

export function attendanceFieldTypeHasNumberValidation(fieldType: AttendanceFieldType): boolean {
  return fieldType === 'number';
}
