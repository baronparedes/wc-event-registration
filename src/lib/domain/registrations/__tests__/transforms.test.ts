import { describe, expect, it } from 'vitest';

import { makeRegistrationSharePayloadRow } from '@/__tests__/factories';

import { formatRegistrationShareFieldValue, formatRegistrationShareText } from '../transforms';
import type { RegistrationSharePayloadRow } from '../types';

const eventTitle = 'Community Night';
const answerFieldId = 'field-1';
const answerFieldLabel = 'Team';
const firstAnswerValue = 'Blue Team';
const secondAnswerValue = 'Red Team';

const rows: RegistrationSharePayloadRow[] = [
  makeRegistrationSharePayloadRow({
    full_name: 'Test Alpha',
    member_id: 'M-100',
    email: 'test.alpha@example.com',
    role: 'Member',
    category: 'Adult',
    answer_values: {
      [answerFieldId]: firstAnswerValue,
    },
  }),
  makeRegistrationSharePayloadRow({
    full_name: 'Test Bravo',
    member_id: 'M-101',
    email: 'test.bravo@example.com',
    role: 'Volunteer',
    category: 'Youth',
    answer_values: {
      [answerFieldId]: secondAnswerValue,
    },
  }),
];

describe('formatRegistrationShareText', () => {
  it('sorts rows by full name before formatting output', () => {
    const output = formatRegistrationShareText({
      rows: [rows[1], rows[0]],
      selectedFields: ['full_name'],
      includeHeader: false,
    });

    expect(output).toBe('1. Test Alpha\n2. Test Bravo');
  });

  it('includes header and selected fields in deterministic order', () => {
    const output = formatRegistrationShareText({
      rows,
      selectedFields: ['full_name', 'email'],
      eventTitle,
    });

    expect(output).toContain(`Registered attendees for ${eventTitle} (2)`);
    expect(output).toContain('1. Test Alpha | Email: test.alpha@example.com');
    expect(output).toContain('2. Test Bravo | Email: test.bravo@example.com');
  });

  it('includes selected answer fields when provided', () => {
    const output = formatRegistrationShareText({
      rows,
      selectedFields: ['full_name'],
      selectedAnswerFieldIds: [answerFieldId],
      answerFields: [{ field_id: answerFieldId, label: answerFieldLabel }],
      includeHeader: false,
    });

    expect(output).toContain(`1. Test Alpha | ${answerFieldLabel}: ${firstAnswerValue}`);
    expect(output).toContain(`2. Test Bravo | ${answerFieldLabel}: ${secondAnswerValue}`);
  });

  it('falls back to full name when selected fields are empty', () => {
    const output = formatRegistrationShareText({
      rows,
      selectedFields: [],
      includeHeader: false,
    });

    expect(output).toBe('1. Test Alpha\n2. Test Bravo');
  });

  it('skips empty static and answer values while preserving row numbering', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Test Charlie',
          member_id: 'M-102',
          email: '',
          role: '',
          category: '',
          answer_values: {
            [answerFieldId]: '   ',
          },
        }),
      ],
      selectedFields: ['full_name', 'email', 'role', 'category'],
      selectedAnswerFieldIds: [answerFieldId],
      answerFields: [{ field_id: answerFieldId, label: answerFieldLabel }],
      includeHeader: false,
    });

    expect(output).toBe('1. Test Charlie');
  });

  it('uses generic answer label and default header title when metadata is missing', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Test Delta',
          member_id: 'M-103',
          email: 'test.delta@example.com',
          role: 'Member',
          category: 'Adult',
          answer_values: {
            unknown_field: 'Needs a seat near front',
          },
        }),
      ],
      selectedFields: ['full_name'],
      selectedAnswerFieldIds: ['unknown_field'],
      answerFields: [],
      eventTitle: '   ',
    });

    expect(output).toContain('Registered attendees for Event (1)');
    expect(output).toContain('1. Test Delta | Answer: Needs a seat near front');
  });

  it('formats registration status and datetime fields for readability', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Test Echo',
          registration_status: 'submitted',
          submitted_at: '2026-07-12T03:30:00.000Z',
          updated_at: '2026-07-12T05:00:00.000Z',
        }),
      ],
      selectedFields: ['full_name', 'registration_status', 'submitted_at', 'updated_at'],
      includeHeader: false,
    });

    expect(output).toContain('1. Test Echo | Registration Status: Submitted');
    expect(output).toContain('Submitted At:');
    expect(output).toContain('Updated At:');
    expect(output).toContain('2026');
  });

  it('handles null or undefined static fields gracefully', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Test Foxtrot',
          email: null as unknown as string,
          phone: undefined as unknown as string,
        }),
      ],
      selectedFields: ['full_name', 'email', 'phone'],
      includeHeader: false,
    });

    expect(output).toBe('1. Test Foxtrot');
  });

  it('handles invalid date strings by returning the raw value', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Test Golf',
          submitted_at: 'not-a-valid-date',
        }),
      ],
      selectedFields: ['full_name', 'submitted_at'],
      includeHeader: false,
    });

    expect(output).toContain('1. Test Golf | Submitted At: not-a-valid-date');
  });

  it('handles missing answer values for selected answer fields', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Test Hotel',
          answer_values: {},
        }),
      ],
      selectedFields: ['full_name'],
      selectedAnswerFieldIds: ['missing-field'],
      answerFields: [{ field_id: 'missing-field', label: 'Missing' }],
      includeHeader: false,
    });

    expect(output).toBe('1. Test Hotel');
  });
});

describe('formatRegistrationShareFieldValue', () => {
  it('returns empty string for null, undefined, or empty/whitespace values', () => {
    expect(formatRegistrationShareFieldValue('full_name', null)).toBe('');
    expect(formatRegistrationShareFieldValue('full_name', undefined)).toBe('');
    expect(formatRegistrationShareFieldValue('full_name', '')).toBe('');
    expect(formatRegistrationShareFieldValue('full_name', '   ')).toBe('');
  });

  it('returns trimmed string for generic fields', () => {
    expect(formatRegistrationShareFieldValue('full_name', ' Test Member ')).toBe('Test Member');
    expect(formatRegistrationShareFieldValue('email', ' test@example.com ')).toBe(
      'test@example.com',
    );
  });

  it('formats registration_status properly', () => {
    expect(formatRegistrationShareFieldValue('registration_status', 'submitted')).toBe('Submitted');
    expect(formatRegistrationShareFieldValue('registration_status', 'submitted_and_updated')).toBe(
      'Submitted And Updated',
    );
  });

  it('formats valid date strings for submitted_at and updated_at', () => {
    // 2026-07-12T03:30:00.000Z is 11:30 AM in Asia/Manila (UTC+8)
    const validDateStr = '2026-07-12T03:30:00.000Z';
    expect(formatRegistrationShareFieldValue('submitted_at', validDateStr)).toMatch(
      /Jul 12, 2026, 11:30\sAM/,
    );
    expect(formatRegistrationShareFieldValue('updated_at', validDateStr)).toMatch(
      /Jul 12, 2026, 11:30\sAM/,
    );
  });

  it('returns trimmed original string for invalid date formats', () => {
    expect(formatRegistrationShareFieldValue('submitted_at', ' Not a date ')).toBe('Not a date');
  });
});
