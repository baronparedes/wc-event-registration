import { describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import type { DynamicFieldRef } from '../types';
import {
  collectDynamicFieldOptions,
  fieldFilterValues,
  findAnswerSummary,
  findFieldGroupingValues,
  getAnswerSummaries,
  getVisibleFieldValue,
  matchesRole,
  sourcePriority,
} from '../field-access';

describe('field-access', () => {
  it('sourcePriority returns correct numeric priority', () => {
    expect(sourcePriority('registration')).toBe(0);
    expect(sourcePriority('attendance')).toBe(1);
    expect(sourcePriority('member')).toBe(2);
    expect(sourcePriority('role')).toBe(3);
    expect(sourcePriority('category')).toBe(3);
  });

  it('fieldFilterValues parses multi_select, multi_select_toggle, and simple answer values', () => {
    expect(
      fieldFilterValues({
        field_key: 'ms',
        field_type: 'multi_select',
        label: 'MS',
        answer_text: JSON.stringify(['Opt 1', 'Opt 2']),
        answer_number: null,
      }),
    ).toEqual(['Opt 1', 'Opt 2']);

    expect(
      fieldFilterValues({
        field_key: 'mst',
        field_type: 'multi_select_toggle',
        label: 'MST',
        answer_text: JSON.stringify({ key1: true, key2: false }),
        answer_number: null,
      }),
    ).toEqual(['key1', 'key2']);

    expect(
      fieldFilterValues({
        field_key: 'num',
        field_type: 'number',
        label: 'Num',
        answer_text: null,
        answer_number: 42,
      }),
    ).toEqual(['42']);

    expect(
      fieldFilterValues({
        field_key: 'empty',
        field_type: 'text',
        label: 'Empty',
        answer_text: null,
        answer_number: null,
      }),
    ).toEqual([]);
  });

  it('getAnswerSummaries and findAnswerSummary return correct answers for registration and attendance', () => {
    const attendee: AttendeeSearchResult = {
      registration_id: 'r1',
      attendee_kind: 'member',
      member_id: 'm1',
      nickname: 'A',
      last_name: 'B',
      email: 'a@b.com',
      check_in_status: 'checked_in',
      check_in_time: null,
      answers: [],
      registration_answers: [
        { field_key: 'reg_field', field_type: 'text', label: 'Reg', answer_text: 'reg_val', answer_number: null },
      ],
      attendance_answers: [
        { field_key: 'att_field', field_type: 'text', label: 'Att', answer_text: 'att_val', answer_number: null },
      ],
    };

    expect(getAnswerSummaries(attendee, 'registration')).toEqual(attendee.registration_answers);
    expect(getAnswerSummaries(attendee, 'attendance')).toEqual(attendee.attendance_answers);
    expect(getAnswerSummaries(attendee, 'member')).toEqual([]);

    expect(
      findAnswerSummary(attendee, { source: 'registration', fieldKey: 'reg_field', label: 'Reg' }),
    ).toEqual(attendee.registration_answers[0]);
    expect(
      findAnswerSummary(attendee, { source: 'attendance', fieldKey: 'att_field', label: 'Att' }),
    ).toEqual(attendee.attendance_answers[0]);
    expect(
      findAnswerSummary(attendee, { source: 'member', fieldKey: 'email', label: 'Email' }),
    ).toBeNull();
    expect(
      findAnswerSummary(attendee, { source: 'registration', fieldKey: 'nonexistent', label: 'X' }),
    ).toBeNull();
  });

  it('findFieldGroupingValues handles role, category, multi_select, multi_select_toggle, and text/number answers', () => {
    const attendee: AttendeeSearchResult = {
      registration_id: 'r1',
      attendee_kind: 'member',
      member_id: 'm1',
      nickname: 'A',
      last_name: 'B',
      email: 'a@b.com',
      check_in_status: 'not_checked_in',
      check_in_time: null,
      answers: [],
      role: 'Leader',
      category: 'Youth',
      registration_answers: [
        { field_key: 'ms', field_type: 'multi_select', label: 'MS', answer_text: JSON.stringify(['A']), answer_number: null },
        { field_key: 'mst', field_type: 'multi_select_toggle', label: 'MST', answer_text: JSON.stringify({ x: true }), answer_number: null },
        { field_key: 'txt', field_type: 'text', label: 'Txt', answer_text: 'Hello', answer_number: null },
      ],
    };

    expect(findFieldGroupingValues(attendee, { source: 'role', fieldKey: 'role', label: 'Role' })).toEqual(['Leader']);
    expect(findFieldGroupingValues(attendee, { source: 'category', fieldKey: 'category', label: 'Category' })).toEqual(['Youth']);
    expect(findFieldGroupingValues({ ...attendee, role: null, category: null }, { source: 'role', fieldKey: 'role', label: 'Role' })).toEqual([]);
    expect(findFieldGroupingValues({ ...attendee, role: null, category: null }, { source: 'category', fieldKey: 'category', label: 'Category' })).toEqual([]);

    expect(findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'ms', label: 'MS' })).toEqual(['A']);
    expect(findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'mst', label: 'MST' })).toEqual(['x']);
    expect(findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'txt', label: 'Txt' })).toEqual(['Hello']);
    expect(findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'none', label: 'None' })).toEqual([]);
  });

  it('collectDynamicFieldOptions aggregates and sorts seeded and attendee dynamic fields correctly', () => {
    const attendee1: AttendeeSearchResult = {
      registration_id: 'r1',
      attendee_kind: 'member',
      member_id: 'm1',
      nickname: 'A',
      last_name: 'B',
      email: 'a@b.com',
      check_in_status: 'checked_in',
      check_in_time: null,
      answers: [],
      registration_answers: [
        { field_key: 't1', field_type: 'text', label: 'B Label', answer_text: 'Val2', answer_number: null },
      ],
      attendance_answers: [],
    };

    const attendee2: AttendeeSearchResult = {
      ...attendee1,
      registration_answers: [
        { field_key: 't1', field_type: 'text', label: 'B Label', answer_text: 'Val1', answer_number: null },
      ],
    };

    const seeded: DynamicFieldRef[] = [
      { source: 'registration', fieldKey: 't1', label: 'B Label', sortOrder: 2 },
      { source: 'registration', fieldKey: 't0', label: 'A Label', sortOrder: 1 },
    ];

    const result = collectDynamicFieldOptions([attendee1, attendee2], seeded);
    expect(result.length).toBe(2);
    expect(result[0].fieldKey).toBe('t0');
    expect(result[1].fieldKey).toBe('t1');
    expect(result[1].values).toEqual(['Val1', 'Val2']);
  });

  it('matchesRole checks role string normalized against set', () => {
    expect(matchesRole('Admin', ['admin', 'user'])).toBe(true);
    expect(matchesRole(null, ['guest'])).toBe(false);
  });

  it('getVisibleFieldValue formats member, role, category, and answer values properly', () => {
    const attendee: AttendeeSearchResult = {
      registration_id: 'r1',
      attendee_kind: 'member',
      member_id: 'M123',
      email: 'm123@example.com',
      full_name: 'Jane Doe',
      nickname: 'Jane',
      last_name: 'Doe',
      role: 'Staff',
      category: 'Adult',
      check_in_status: 'checked_in',
      check_in_time: null,
      answers: [],
      registration_answers: [
        { field_key: 'f_txt', field_type: 'text', label: 'Txt', answer_text: 'Text Value', answer_number: null },
        { field_key: 'f_num', field_type: 'number', label: 'Num', answer_text: null, answer_number: 99 },
        { field_key: 'f_empty', field_type: 'text', label: 'Empty', answer_text: '   ', answer_number: null },
      ],
    };

    expect(getVisibleFieldValue(undefined, { source: 'member', fieldKey: 'email', label: '' })).toBe('—');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'member_id', label: '' })).toBe('M123');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'email', label: '' })).toBe('m123@example.com');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'full_name', label: '' })).toBe('Jane Doe');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'check_in_status', label: '' })).toBe('Checked In');
    expect(getVisibleFieldValue({ ...attendee, check_in_status: 'not_checked_in' }, { source: 'member', fieldKey: 'check_in_status', label: '' })).toBe('Not Checked In');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'checked_in_slot', label: '' })).toBe('—');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'unknown', label: '' })).toBe('—');

    expect(getVisibleFieldValue(attendee, { source: 'role', fieldKey: 'role', label: '' })).toBe('Staff');
    expect(getVisibleFieldValue(attendee, { source: 'category', fieldKey: 'category', label: '' })).toBe('Adult');

    expect(getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_txt', label: '' })).toBe('Text Value');
    expect(getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_num', label: '' })).toBe('99');
    expect(getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_empty', label: '' })).toBe('—');
    expect(getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_missing', label: '' })).toBe('—');
  });
});
