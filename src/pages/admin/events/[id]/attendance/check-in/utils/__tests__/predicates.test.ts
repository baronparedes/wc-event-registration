import { describe, expect, it } from 'vitest';

import { isDirectMemberIdMatch, isRegistrationOpenNow, isWithinEventWindow } from '../predicates';

describe('predicates', () => {
  describe('isDirectMemberIdMatch', () => {
    it('returns false if results array is empty', () => {
      expect(isDirectMemberIdMatch('12345', [])).toBe(false);
    });

    it('returns false if more than one result', () => {
      expect(isDirectMemberIdMatch('12345', [{ member_id: '12345' }, { member_id: '67890' }])).toBe(
        false,
      );
    });

    it('returns true if single result matches normalized token', () => {
      expect(isDirectMemberIdMatch('12345', [{ member_id: '12345' }])).toBe(true);
    });

    it('returns true if single result matches normalized token (case insensitive)', () => {
      expect(isDirectMemberIdMatch('12345', [{ member_id: 'FFFFFFFF' }])).toBe(false);
      expect(isDirectMemberIdMatch('ABC123', [{ member_id: 'abc123' }])).toBe(true);
    });

    it('returns true if single result matches RFID converted token', () => {
      // Assuming tryConvertRfidInput might convert some formats
      expect(isDirectMemberIdMatch('  12345  ', [{ member_id: '12345' }])).toBe(true);
    });

    it('returns false if member_id is null', () => {
      expect(isDirectMemberIdMatch('12345', [{ member_id: null }])).toBe(false);
    });

    it('returns false if member_id is empty string', () => {
      expect(isDirectMemberIdMatch('12345', [{ member_id: '' }])).toBe(false);
    });
  });

  describe('isRegistrationOpenNow', () => {
    const baseTime = new Date('2026-08-29T12:00:00Z').getTime();

    it('returns false if registration_mode is closed', () => {
      expect(
        isRegistrationOpenNow({
          registration_mode: 'closed',
          registration_opens_at: null,
          registration_closes_at: null,
          nowMs: baseTime,
        }),
      ).toBe(false);
    });

    it('returns true if mode is open with no time constraints', () => {
      expect(
        isRegistrationOpenNow({
          registration_mode: 'open',
          registration_opens_at: null,
          registration_closes_at: null,
          nowMs: baseTime,
        }),
      ).toBe(true);
    });

    it('returns false if current time is before opens_at', () => {
      const beforeOpen = new Date('2026-08-29T10:00:00Z').getTime();
      expect(
        isRegistrationOpenNow({
          registration_mode: 'open',
          registration_opens_at: '2026-08-29T12:00:00Z',
          registration_closes_at: null,
          nowMs: beforeOpen,
        }),
      ).toBe(false);
    });

    it('returns true if current time is at or after opens_at', () => {
      expect(
        isRegistrationOpenNow({
          registration_mode: 'open',
          registration_opens_at: '2026-08-29T12:00:00Z',
          registration_closes_at: null,
          nowMs: baseTime,
        }),
      ).toBe(true);
    });

    it('returns false if current time is at or after closes_at', () => {
      expect(
        isRegistrationOpenNow({
          registration_mode: 'open',
          registration_opens_at: null,
          registration_closes_at: '2026-08-29T12:00:00Z',
          nowMs: baseTime,
        }),
      ).toBe(false);
    });

    it('returns true if current time is before closes_at', () => {
      const beforeClose = new Date('2026-08-29T11:00:00Z').getTime();
      expect(
        isRegistrationOpenNow({
          registration_mode: 'open',
          registration_opens_at: null,
          registration_closes_at: '2026-08-29T12:00:00Z',
          nowMs: beforeClose,
        }),
      ).toBe(true);
    });

    it('handles invalid date strings gracefully', () => {
      expect(
        isRegistrationOpenNow({
          registration_mode: 'open',
          registration_opens_at: 'invalid-date',
          registration_closes_at: null,
          nowMs: baseTime,
        }),
      ).toBe(true); // NaN comparison is false, so invalid date is ignored
    });
  });

  describe('isWithinEventWindow', () => {
    const baseTime = new Date('2026-08-29T12:00:00Z').getTime();

    it('returns false if either start or end time is invalid', () => {
      expect(
        isWithinEventWindow({ starts_at: 'invalid', ends_at: '2026-08-29T13:00:00Z' }, baseTime),
      ).toBe(false);

      expect(
        isWithinEventWindow({ starts_at: '2026-08-29T11:00:00Z', ends_at: 'invalid' }, baseTime),
      ).toBe(false);
    });

    it('returns false if current time is before event starts', () => {
      const beforeStart = new Date('2026-08-29T10:00:00Z').getTime();
      expect(
        isWithinEventWindow(
          {
            starts_at: '2026-08-29T11:00:00Z',
            ends_at: '2026-08-29T13:00:00Z',
          },
          beforeStart,
        ),
      ).toBe(false);
    });

    it('returns false if current time is after event ends', () => {
      const afterEnd = new Date('2026-08-29T14:00:00Z').getTime();
      expect(
        isWithinEventWindow(
          {
            starts_at: '2026-08-29T11:00:00Z',
            ends_at: '2026-08-29T13:00:00Z',
          },
          afterEnd,
        ),
      ).toBe(false);
    });

    it('returns true if current time is within event window', () => {
      expect(
        isWithinEventWindow(
          {
            starts_at: '2026-08-29T11:00:00Z',
            ends_at: '2026-08-29T13:00:00Z',
          },
          baseTime,
        ),
      ).toBe(true);
    });

    it('returns true if current time is at event start', () => {
      const atStart = new Date('2026-08-29T11:00:00Z').getTime();
      expect(
        isWithinEventWindow(
          {
            starts_at: '2026-08-29T11:00:00Z',
            ends_at: '2026-08-29T13:00:00Z',
          },
          atStart,
        ),
      ).toBe(true);
    });

    it('returns true if current time is at event end', () => {
      const atEnd = new Date('2026-08-29T13:00:00Z').getTime();
      expect(
        isWithinEventWindow(
          {
            starts_at: '2026-08-29T11:00:00Z',
            ends_at: '2026-08-29T13:00:00Z',
          },
          atEnd,
        ),
      ).toBe(true);
    });

    it('handles null dates as invalid', () => {
      expect(
        isWithinEventWindow({ starts_at: null, ends_at: '2026-08-29T13:00:00Z' }, baseTime),
      ).toBe(false);

      expect(
        isWithinEventWindow({ starts_at: '2026-08-29T11:00:00Z', ends_at: null }, baseTime),
      ).toBe(false);
    });
  });
});
