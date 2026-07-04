import { describe, expect, it } from 'vitest';

import {
  attendanceFieldTypeHasDateValidation,
  attendanceFieldTypeHasMultiSelectValidation,
  attendanceFieldTypeHasNumberValidation,
  attendanceFieldTypeHasOptions,
  attendanceFieldTypeHasTextValidation,
} from '@/lib/domain/attendance-fields';

describe('attendance-fields metadata helpers', () => {
  it('reports option-backed field types correctly', () => {
    expect(attendanceFieldTypeHasOptions('select')).toBe(true);
    expect(attendanceFieldTypeHasOptions('radio')).toBe(true);
    expect(attendanceFieldTypeHasOptions('multi_select')).toBe(true);
    expect(attendanceFieldTypeHasOptions('multi_select_toggle')).toBe(true);
    expect(attendanceFieldTypeHasOptions('text')).toBe(false);
    expect(attendanceFieldTypeHasOptions('date')).toBe(false);
  });

  it('reports text validation support correctly', () => {
    expect(attendanceFieldTypeHasTextValidation('text')).toBe(true);
    expect(attendanceFieldTypeHasTextValidation('textarea')).toBe(true);
    expect(attendanceFieldTypeHasTextValidation('email')).toBe(true);
    expect(attendanceFieldTypeHasTextValidation('phone')).toBe(true);
    expect(attendanceFieldTypeHasTextValidation('number')).toBe(false);
    expect(attendanceFieldTypeHasTextValidation('date')).toBe(false);
  });

  it('reports number validation support correctly', () => {
    expect(attendanceFieldTypeHasNumberValidation('number')).toBe(true);
    expect(attendanceFieldTypeHasNumberValidation('text')).toBe(false);
    expect(attendanceFieldTypeHasNumberValidation('phone')).toBe(false);
  });

  it('reports multi-select validation support correctly', () => {
    expect(attendanceFieldTypeHasMultiSelectValidation('multi_select')).toBe(true);
    expect(attendanceFieldTypeHasMultiSelectValidation('multi_select_toggle')).toBe(true);
    expect(attendanceFieldTypeHasMultiSelectValidation('select')).toBe(false);
    expect(attendanceFieldTypeHasMultiSelectValidation('radio')).toBe(false);
  });

  it('reports date validation support correctly', () => {
    expect(attendanceFieldTypeHasDateValidation('date')).toBe(true);
    expect(attendanceFieldTypeHasDateValidation('datetime')).toBe(true);
    expect(attendanceFieldTypeHasDateValidation('text')).toBe(false);
    expect(attendanceFieldTypeHasDateValidation('number')).toBe(false);
  });

  it('covers all non-validation field types correctly', () => {
    // Boolean types should not have validation
    expect(attendanceFieldTypeHasTextValidation('boolean')).toBe(false);
    expect(attendanceFieldTypeHasNumberValidation('boolean')).toBe(false);
    expect(attendanceFieldTypeHasMultiSelectValidation('boolean')).toBe(false);
    expect(attendanceFieldTypeHasDateValidation('boolean')).toBe(false);

    // Checkbox should not have validation
    expect(attendanceFieldTypeHasTextValidation('checkbox')).toBe(false);
    expect(attendanceFieldTypeHasNumberValidation('checkbox')).toBe(false);
    expect(attendanceFieldTypeHasMultiSelectValidation('checkbox')).toBe(false);
    expect(attendanceFieldTypeHasDateValidation('checkbox')).toBe(false);
  });
});
