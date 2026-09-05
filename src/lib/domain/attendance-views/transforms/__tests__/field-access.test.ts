import { describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import type { DynamicFieldRef } from '@/lib/domain/attendance-views';

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
        event_field_id: 'ef1',
        field_key: 'ms',
        field_type: 'multi_select',
        label: 'MS',
        answer_text: JSON.stringify(['Opt 1', 'Opt 2']),
        answer_number: null,
      }),
    ).toEqual(['Opt 1', 'Opt 2']);

    expect(
      fieldFilterValues({
        event_field_id: 'ef2',
        field_key: 'mst',
        field_type: 'multi_select_toggle',
        label: 'MST',
        answer_text: JSON.stringify({ key1: true, key2: false }),
        answer_number: null,
      }),
    ).toEqual(['key1', 'key2']);

    expect(
      fieldFilterValues({
        event_field_id: 'ef3',
        field_key: 'num',
        field_type: 'number',
        label: 'Num',
        answer_text: null,
        answer_number: 42,
      }),
    ).toEqual(['42']);

    expect(
      fieldFilterValues({
        event_field_id: 'ef4',
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
      public_registration_id: null,
      user_id: 'u1',
      attendee_kind: 'registered',
      member_id: 'm1',
      nickname: 'A',
      last_name: 'B',
      full_name: 'A B',
      email: 'a@b.com',
      role: 'member',
      category: 'adult',
      registration_status: 'submitted',
      submitted_at: '2025-01-01',
      check_in_status: 'checked_in',
      official_check_in_time: '2025-01-01',
      registration_answers: [
        {
          event_field_id: 'rf1',
          field_key: 'reg_field',
          field_type: 'text',
          label: 'Reg',
          answer_text: 'reg_val',
          answer_number: null,
        },
      ],
      attendance_answers: [
        {
          attendance_field_id: 'af1',
          field_key: 'att_field',
          field_type: 'text',
          label: 'Att',
          answer_text: 'att_val',
          answer_number: null,
        },
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
      public_registration_id: null,
      user_id: 'u1',
      attendee_kind: 'registered',
      member_id: 'm1',
      nickname: 'A',
      last_name: 'B',
      full_name: 'A B',
      email: 'a@b.com',
      role: 'Leader',
      category: 'Youth',
      registration_status: 'submitted',
      submitted_at: '2025-01-01',
      check_in_status: 'not_checked_in',
      official_check_in_time: null,
      attendance_answers: [],
      registration_answers: [
        {
          event_field_id: 'rf1',
          field_key: 'ms',
          field_type: 'multi_select',
          label: 'MS',
          answer_text: JSON.stringify(['A']),
          answer_number: null,
        },
        {
          event_field_id: 'rf2',
          field_key: 'mst',
          field_type: 'multi_select_toggle',
          label: 'MST',
          answer_text: JSON.stringify({ x: true }),
          answer_number: null,
        },
        {
          event_field_id: 'rf3',
          field_key: 'txt',
          field_type: 'text',
          label: 'Txt',
          answer_text: 'Hello',
          answer_number: null,
        },
      ],
    };

    expect(
      findFieldGroupingValues(attendee, { source: 'role', fieldKey: 'role', label: 'Role' }),
    ).toEqual(['Leader']);
    expect(
      findFieldGroupingValues(attendee, {
        source: 'category',
        fieldKey: 'category',
        label: 'Category',
      }),
    ).toEqual(['Youth']);

    expect(
      findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'ms', label: 'MS' }),
    ).toEqual(['A']);
    expect(
      findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'mst', label: 'MST' }),
    ).toEqual(['x']);
    expect(
      findFieldGroupingValues(attendee, { source: 'registration', fieldKey: 'txt', label: 'Txt' }),
    ).toEqual(['Hello']);
    expect(
      findFieldGroupingValues(attendee, {
        source: 'registration',
        fieldKey: 'none',
        label: 'None',
      }),
    ).toEqual([]);
  });

  it('collectDynamicFieldOptions aggregates and sorts seeded and attendee dynamic fields correctly', () => {
    const attendee1: AttendeeSearchResult = {
      registration_id: 'r1',
      public_registration_id: null,
      user_id: 'u1',
      attendee_kind: 'registered',
      member_id: 'm1',
      nickname: 'A',
      last_name: 'B',
      full_name: 'A B',
      email: 'a@b.com',
      role: 'member',
      category: 'adult',
      registration_status: 'submitted',
      submitted_at: '2025-01-01',
      check_in_status: 'checked_in',
      official_check_in_time: '2025-01-01',
      registration_answers: [
        {
          event_field_id: 'rf1',
          field_key: 't1',
          field_type: 'text',
          label: 'B Label',
          answer_text: 'Val2',
          answer_number: null,
        },
      ],
      attendance_answers: [],
    };

    const attendee2: AttendeeSearchResult = {
      ...attendee1,
      registration_answers: [
        {
          event_field_id: 'rf1',
          field_key: 't1',
          field_type: 'text',
          label: 'B Label',
          answer_text: 'Val1',
          answer_number: null,
        },
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
      public_registration_id: null,
      user_id: 'u1',
      attendee_kind: 'registered',
      member_id: 'M123',
      email: 'm123@example.com',
      full_name: 'Jane Doe',
      nickname: 'Jane',
      last_name: 'Doe',
      role: 'Staff',
      category: 'Adult',
      registration_status: 'submitted',
      submitted_at: '2025-01-01',
      check_in_status: 'checked_in',
      official_check_in_time: '2025-01-01',
      attendance_answers: [],
      registration_answers: [
        {
          event_field_id: 'rf1',
          field_key: 'f_txt',
          field_type: 'text',
          label: 'Txt',
          answer_text: 'Text Value',
          answer_number: null,
        },
        {
          event_field_id: 'rf2',
          field_key: 'f_num',
          field_type: 'number',
          label: 'Num',
          answer_text: null,
          answer_number: 99,
        },
        {
          event_field_id: 'rf3',
          field_key: 'f_empty',
          field_type: 'text',
          label: 'Empty',
          answer_text: '   ',
          answer_number: null,
        },
      ],
    };

    expect(
      getVisibleFieldValue(undefined, { source: 'member', fieldKey: 'email', label: '' }),
    ).toBe('—');
    expect(
      getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'member_id', label: '' }),
    ).toBe('M123');
    expect(getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'email', label: '' })).toBe(
      'm123@example.com',
    );
    expect(
      getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'full_name', label: '' }),
    ).toBe('Jane Doe');
    expect(
      getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'check_in_status', label: '' }),
    ).toBe('Checked In');
    expect(
      getVisibleFieldValue(
        { ...attendee, check_in_status: 'not_checked_in' },
        { source: 'member', fieldKey: 'check_in_status', label: '' },
      ),
    ).toBe('Not Checked In');
    expect(
      getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'checked_in_slot', label: '' }),
    ).toBe('—');
    expect(
      getVisibleFieldValue(attendee, { source: 'member', fieldKey: 'unknown', label: '' }),
    ).toBe('—');

    expect(getVisibleFieldValue(attendee, { source: 'role', fieldKey: 'role', label: '' })).toBe(
      'Staff',
    );
    expect(
      getVisibleFieldValue(attendee, { source: 'category', fieldKey: 'category', label: '' }),
    ).toBe('Adult');

    expect(
      getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_txt', label: '' }),
    ).toBe('Text Value');
    expect(
      getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_num', label: '' }),
    ).toBe('99');
    expect(
      getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_empty', label: '' }),
    ).toBe('—');
    expect(
      getVisibleFieldValue(attendee, { source: 'registration', fieldKey: 'f_missing', label: '' }),
    ).toBe('—');
  });
});
