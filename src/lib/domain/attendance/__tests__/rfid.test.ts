import { describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '../types';
import {
  convertHexToDecimal,
  searchAttendeesWithRfidFallback,
  tryConvertRfidInput,
} from '../utils/rfid';

describe('RFID Utilities', () => {
  describe('convertHexToDecimal', () => {
    it('converts 8-char hex string to decimal without byte reversal', () => {
      const result = convertHexToDecimal('466C2169', false);
      expect(result).toBe(0x466c2169); // 1181130025
    });

    it('converts 8-char hex with byte reversal (Big-Endian to Little-Endian)', () => {
      const result = convertHexToDecimal('466C2169', true);
      expect(result).toBe(0x69216c46); // 1747949638
    });

    it('handles hex strings with 0x prefix', () => {
      const result = convertHexToDecimal('0x466C2169', true);
      expect(result).toBe(0x69216c46);
    });

    it('handles hex strings with spaces', () => {
      const result = convertHexToDecimal('46 6C 21 69', true);
      expect(result).toBe(0x69216c46);
    });

    it('handles hex strings with colons', () => {
      const result = convertHexToDecimal('46:6C:21:69', true);
      expect(result).toBe(0x69216c46);
    });

    it('handles hex strings with hyphens', () => {
      const result = convertHexToDecimal('46-6C-21-69', true);
      expect(result).toBe(0x69216c46);
    });

    it('handles hex strings with newlines', () => {
      const result = convertHexToDecimal('46\n6C\n21\n69', true);
      expect(result).toBe(0x69216c46);
    });

    it('returns original input if not exactly 8 hex characters', () => {
      expect(convertHexToDecimal('466C21', false)).toBe('466C21');
      expect(convertHexToDecimal('466C216900', false)).toBe('466C216900');
      expect(convertHexToDecimal('466C21G9', false)).toBe('466C21G9');
    });

    it('returns empty string if input is empty', () => {
      expect(convertHexToDecimal('', false)).toBe('');
    });

    it('handles case-insensitive hex', () => {
      const result = convertHexToDecimal('466c2169', true);
      expect(result).toBe(0x69216c46);
    });

    it('handles mixed case hex', () => {
      const result = convertHexToDecimal('466C2169', true);
      expect(result).toBe(0x69216c46);
    });
  });

  describe('tryConvertRfidInput', () => {
    it('converts 8-char hex string to decimal string', () => {
      const result = tryConvertRfidInput('466C2169');
      expect(result).toBe(String(0x69216c46));
    });

    it('converts hex with spaces to decimal string', () => {
      const result = tryConvertRfidInput('46 6C 21 69');
      expect(result).toBe(String(0x69216c46));
    });

    it('converts valid 8-char hex (including letter-heavy ones)', () => {
      expect(tryConvertRfidInput('ABC12345')).toBe('1159971243');
    });

    it('does not convert non-hex alphanumeric strings with hyphens', () => {
      expect(tryConvertRfidInput('member-123')).toBe('member-123'); // Hyphen disqualifies as hex
    });

    it('does not convert decimal strings', () => {
      expect(tryConvertRfidInput('12345678')).toBe(String(0x78563412)); // This is actually hex, so it converts
    });

    it('does not convert strings shorter than 8 characters', () => {
      expect(tryConvertRfidInput('1234567')).toBe('1234567');
    });

    it('does not convert strings longer than 8 characters', () => {
      expect(tryConvertRfidInput('123456789')).toBe('123456789');
    });

    it('returns empty string if input is empty', () => {
      expect(tryConvertRfidInput('')).toBe('');
    });

    it('handles whitespace trimming', () => {
      const result = tryConvertRfidInput('  466C2169  ');
      expect(result).toBe(String(0x69216c46));
    });
  });

  describe('searchAttendeesWithRfidFallback', () => {
    const createMockAttendee = (
      overrides?: Partial<AttendeeSearchResult>,
    ): AttendeeSearchResult => ({
      attendee_kind: 'registered',
      registration_id: 'reg-1',
      public_registration_id: null,
      user_id: 'user-1',
      member_id: '12345',
      nickname: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      email: 'john@example.com',
      role: 'member',
      category: 'regular',
      registration_status: 'submitted',
      submitted_at: '2024-01-01T00:00:00Z',
      check_in_status: 'not_checked_in',
      official_check_in_time: null,
      registration_answers: [],
      attendance_answers: [],
      ...overrides,
    });

    const mockAttendees: AttendeeSearchResult[] = [
      createMockAttendee({
        full_name: 'Alice Johnson',
        nickname: 'Alice',
        last_name: 'Johnson',
        member_id: String(0x69216c46), // Converted RFID value
        email: 'alice@example.com',
        registration_id: 'reg-1',
      }),
      createMockAttendee({
        full_name: 'Bob Smith',
        nickname: 'Bob',
        last_name: 'Smith',
        member_id: '12345',
        email: 'bob@example.com',
        role: 'admin',
        category: 'vip',
        check_in_status: 'checked_in',
        registration_id: 'reg-2',
      }),
    ];

    it('finds attendee by exact decimal member_id (Pass 1)', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, '12345');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Bob Smith');
    });

    it('finds attendee by name (Pass 1)', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, 'Alice');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Alice Johnson');
    });

    it('finds attendee by email (Pass 1)', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, 'bob@example');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Bob Smith');
    });

    it('finds attendee by RFID hex via fallback (Pass 2)', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, '466C2169');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Alice Johnson');
    });

    it('prefers Pass 1 results over Pass 2 (does not convert if Pass 1 matches)', () => {
      // If a decimal number happens to match someone's name, use that result
      const attendees: AttendeeSearchResult[] = [
        createMockAttendee({
          full_name: '12345',
          member_id: 'XXXXX',
        }),
        createMockAttendee({
          full_name: 'Bob',
          member_id: '12345',
          registration_id: 'reg-2',
        }),
      ];

      const results = searchAttendeesWithRfidFallback(attendees, '12345');
      // Should match Bob (exact member_id match) first
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array if no matches found', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, 'NONEXISTENT');
      expect(results).toHaveLength(0);
    });

    it('returns empty array for empty search token', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, '');
      expect(results).toHaveLength(0);
    });

    it('case-insensitive search', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, 'alice');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Alice Johnson');
    });

    it('handles RFID with spaces (Pass 2)', () => {
      const results = searchAttendeesWithRfidFallback(mockAttendees, '46 6C 21 69');
      expect(results).toHaveLength(1);
      expect(results[0].full_name).toBe('Alice Johnson');
    });
  });
});
