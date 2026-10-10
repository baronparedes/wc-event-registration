import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSmsUri,
  buildViberChatUri,
  copyPhoneNumberToClipboard,
  formatInternationalPhoneNumber,
  getMessagingLinks,
  isValidPhoneNumber,
  sanitizePhoneNumber,
} from '../messagingUtils';

describe('messagingUtils', () => {
  describe('sanitizePhoneNumber', () => {
    it('returns empty string for empty or whitespace-only inputs', () => {
      expect(sanitizePhoneNumber('')).toBe('');
      expect(sanitizePhoneNumber('   ')).toBe('');
    });

    it('removes spaces, hyphens, dots, and parentheses', () => {
      expect(sanitizePhoneNumber('(0917) 123-4567')).toBe('09171234567');
      expect(sanitizePhoneNumber('0917.123.4567')).toBe('09171234567');
      expect(sanitizePhoneNumber('+63 (917) 123-4567')).toBe('+639171234567');
    });

    it('preserves leading plus', () => {
      expect(sanitizePhoneNumber('+1-800-555-0199')).toBe('+18005550199');
      expect(sanitizePhoneNumber(' +63 917 123 4567 ')).toBe('+639171234567');
    });

    it('converts international prefix 00 to plus', () => {
      expect(sanitizePhoneNumber('0063-917-123-4567')).toBe('+639171234567');
      expect(sanitizePhoneNumber('0015551234567')).toBe('+15551234567');
    });

    it('returns empty string if no digits exist', () => {
      expect(sanitizePhoneNumber('abc--')).toBe('');
      expect(sanitizePhoneNumber('+()--')).toBe('');
    });
  });

  describe('formatInternationalPhoneNumber', () => {
    it('returns empty string when given empty input', () => {
      expect(formatInternationalPhoneNumber('')).toBe('');
    });

    it('formats local trunk Philippine numbers starting with 0', () => {
      expect(formatInternationalPhoneNumber('09171234567')).toBe('+639171234567');
      expect(formatInternationalPhoneNumber('0917-123-4567')).toBe('+639171234567');
    });

    it('preserves already-international numbers with leading plus', () => {
      expect(formatInternationalPhoneNumber('+639171234567')).toBe('+639171234567');
      expect(formatInternationalPhoneNumber('+15551234567')).toBe('+15551234567');
    });

    it('prepends plus when number starts with country code without plus', () => {
      expect(formatInternationalPhoneNumber('639171234567')).toBe('+639171234567');
    });

    it('prepends default country code when number has no trunk or country code', () => {
      expect(formatInternationalPhoneNumber('9171234567')).toBe('+639171234567');
    });

    it('supports custom defaultCountryCode', () => {
      expect(formatInternationalPhoneNumber('0412345678', '61')).toBe('+61412345678');
      expect(formatInternationalPhoneNumber('412345678', '61')).toBe('+61412345678');
      expect(formatInternationalPhoneNumber('+447911123456', '61')).toBe('+447911123456');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('validates E.164 phone numbers (7 to 15 digits)', () => {
      expect(isValidPhoneNumber('09171234567')).toBe(true);
      expect(isValidPhoneNumber('+639171234567')).toBe(true);
      expect(isValidPhoneNumber('+15551234567')).toBe(true);
      expect(isValidPhoneNumber('1234567', '1')).toBe(true); // 8 digits total (+1 + 7 digits)
    });

    it('rejects numbers that are too short or too long', () => {
      expect(isValidPhoneNumber('123')).toBe(false); // only 3 digits
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('12345678901234567890')).toBe(false); // >15 digits
    });

    it('rejects invalid or non-string inputs', () => {
      expect(isValidPhoneNumber(undefined as unknown as string)).toBe(false);
      expect(isValidPhoneNumber('abcdefg')).toBe(false);
    });
  });

  describe('buildSmsUri', () => {
    it('returns standard RFC 5724 sms: URI without body', () => {
      const uri = buildSmsUri('09171234567');
      expect(uri).toBe('sms:+639171234567');
    });

    it('returns sms: URI with URL-encoded body parameter', () => {
      const uri = buildSmsUri('09171234567', {
        body: 'Hello World! How are you & family?',
      });
      expect(uri).toBe('sms:+639171234567?body=Hello%20World!%20How%20are%20you%20%26%20family%3F');
    });

    it('handles special characters and newlines in message body', () => {
      const uri = buildSmsUri('+15551234567', {
        body: 'Line 1\nLine 2 = $100',
      });
      expect(uri).toBe('sms:+15551234567?body=Line%201%0ALine%202%20%3D%20%24100');
    });

    it('returns empty string for invalid phone numbers', () => {
      expect(buildSmsUri('')).toBe('');
      expect(buildSmsUri('123')).toBe('');
      expect(buildSmsUri('invalid-phone')).toBe('');
    });
  });

  describe('buildViberChatUri', () => {
    it('returns viber://chat URI with %2B encoded plus sign', () => {
      const uri = buildViberChatUri('09171234567');
      expect(uri).toBe('viber://chat?number=%2B639171234567');
    });

    it('includes URL-encoded text parameter', () => {
      const uri = buildViberChatUri('+639171234567', {
        text: 'Hi there! Looking forward to the event.',
      });
      expect(uri).toBe(
        'viber://chat?number=%2B639171234567&text=Hi%20there!%20Looking%20forward%20to%20the%20event.',
      );
    });

    it('returns empty string for invalid phone numbers', () => {
      expect(buildViberChatUri('')).toBe('');
      expect(buildViberChatUri('123')).toBe('');
    });
  });

  describe('getMessagingLinks', () => {
    it('returns full messaging links object for valid phone', () => {
      const result = getMessagingLinks('0917-123-4567', {
        message: 'Welcome to Welcome Hub!',
      });

      expect(result.isValid).toBe(true);
      expect(result.formattedNumber).toBe('+639171234567');
      expect(result.smsUri).toBe('sms:+639171234567?body=Welcome%20to%20Welcome%20Hub!');
      expect(result.viberUri).toBe(
        'viber://chat?number=%2B639171234567&text=Welcome%20to%20Welcome%20Hub!',
      );
    });

    it('returns empty URIs and isValid: false for invalid phone', () => {
      const result = getMessagingLinks('999');
      expect(result.isValid).toBe(false);
      expect(result.smsUri).toBe('');
      expect(result.viberUri).toBe('');
      expect(result.formattedNumber).toBe('');
    });
  });

  describe('copyPhoneNumberToClipboard', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns false when given an empty phone string', async () => {
      const res = await copyPhoneNumberToClipboard('');
      expect(res).toBe(false);
    });

    it('uses navigator.clipboard.writeText when available', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const success = await copyPhoneNumberToClipboard('+639171234567');
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('+639171234567');
    });

    it('falls back to document.execCommand when navigator.clipboard fails', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
        configurable: true,
        writable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const success = await copyPhoneNumberToClipboard('+639171234567');
      expect(success).toBe(true);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });
});
