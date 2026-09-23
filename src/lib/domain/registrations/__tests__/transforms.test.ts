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
    full_name: 'Alice Santos',
    member_id: 'M-100',
    email: 'alice@example.com',
    role: 'Member',
    category: 'Adult',
    answer_values: {
      [answerFieldId]: firstAnswerValue,
    },
  }),
  makeRegistrationSharePayloadRow({
    full_name: 'Bob Reyes',
    member_id: 'M-101',
    email: 'bob@example.com',
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

    expect(output).toBe('1. Alice Santos\n2. Bob Reyes');
  });

  it('includes header and selected fields in deterministic order', () => {
    const output = formatRegistrationShareText({
      rows,
      selectedFields: ['full_name', 'email'],
      eventTitle,
    });

    expect(output).toContain(`Registered attendees for ${eventTitle} (2)`);
    expect(output).toContain('1. Alice Santos | Email: alice@example.com');
    expect(output).toContain('2. Bob Reyes | Email: bob@example.com');
  });

  it('includes selected answer fields when provided', () => {
    const output = formatRegistrationShareText({
      rows,
      selectedFields: ['full_name'],
      selectedAnswerFieldIds: [answerFieldId],
      answerFields: [{ field_id: answerFieldId, label: answerFieldLabel }],
      includeHeader: false,
    });

    expect(output).toContain(`1. Alice Santos | ${answerFieldLabel}: ${firstAnswerValue}`);
    expect(output).toContain(`2. Bob Reyes | ${answerFieldLabel}: ${secondAnswerValue}`);
  });

  it('falls back to full name when selected fields are empty', () => {
    const output = formatRegistrationShareText({
      rows,
      selectedFields: [],
      includeHeader: false,
    });

    expect(output).toBe('1. Alice Santos\n2. Bob Reyes');
  });

  it('skips empty static and answer values while preserving row numbering', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Charlie Dela Cruz',
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

    expect(output).toBe('1. Charlie Dela Cruz');
  });

  it('uses generic answer label and default header title when metadata is missing', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Dana Villanueva',
          member_id: 'M-103',
          email: 'dana@example.com',
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
    expect(output).toContain('1. Dana Villanueva | Answer: Needs a seat near front');
  });

  it('formats registration status and datetime fields for readability', () => {
    const output = formatRegistrationShareText({
      rows: [
        makeRegistrationSharePayloadRow({
          full_name: 'Elliot Perez',
          registration_status: 'submitted',
          submitted_at: '2026-07-12T03:30:00.000Z',
          updated_at: '2026-07-12T05:00:00.000Z',
        }),
      ],
      selectedFields: ['full_name', 'registration_status', 'submitted_at', 'updated_at'],
      includeHeader: false,
    });

    expect(output).toContain('1. Elliot Perez | Registration Status: Submitted');
    expect(output).toContain('Submitted At:');
    expect(output).toContain('Updated At:');
    expect(output).toContain('2026');
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
    expect(formatRegistrationShareFieldValue('full_name', ' John Doe ')).toBe('John Doe');
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
