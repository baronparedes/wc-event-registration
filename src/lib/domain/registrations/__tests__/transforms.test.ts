import { describe, expect, it } from 'vitest';

import { makeRegistrationSharePayloadRow } from '@/__tests__/factories';

import { formatRegistrationShareText } from '../transforms';
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
});
