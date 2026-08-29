import { describe, expect, it } from 'vitest';

import type { AttendanceTimeslotConfig } from '@/lib/domain/attendance';

import { resolveSuggestedTimeslot } from '../timeslotCalculations';

describe('timeslotCalculations', () => {
  describe('resolveSuggestedTimeslot', () => {
    const baseTime = new Date('2026-08-29T12:00:00Z').getTime();

    it('returns empty string if timeslots are disabled', () => {
      const result = resolveSuggestedTimeslot({
        timeslotEnabled: false,
        timeslots: [],
        autoWindowModeEnabled: false,
        activeTimeslot: null,
        nowMs: baseTime,
      });

      expect(result).toBe('');
    });

    it('returns empty string if no timeslots available', () => {
      const result = resolveSuggestedTimeslot({
        timeslotEnabled: true,
        timeslots: [],
        autoWindowModeEnabled: false,
        activeTimeslot: null,
        nowMs: baseTime,
      });

      expect(result).toBe('');
    });

    it('returns active timeslot in auto-window mode if available', () => {
      const slots: AttendanceTimeslotConfig[] = [
        {
          slot_at: '2026-08-29T11:00:00Z',
          opens_at: '2026-08-29T10:00:00Z',
          closes_at: '2026-08-29T12:00:00Z',
        },
        {
          slot_at: '2026-08-29T13:00:00Z',
          opens_at: null,
          closes_at: null,
        },
      ];

      const result = resolveSuggestedTimeslot({
        timeslotEnabled: true,
        timeslots: slots,
        autoWindowModeEnabled: true,
        activeTimeslot: {
          slot_at: '2026-08-29T11:00:00Z',
        },
        nowMs: baseTime,
      });

      expect(result).toBe('2026-08-29T11:00:00Z');
    });

    it('returns empty string in auto-window mode if no active timeslot', () => {
      const slots: AttendanceTimeslotConfig[] = [
        {
          slot_at: '2026-08-29T11:00:00Z',
          opens_at: null,
          closes_at: null,
        },
      ];

      const result = resolveSuggestedTimeslot({
        timeslotEnabled: true,
        timeslots: slots,
        autoWindowModeEnabled: true,
        activeTimeslot: null,
        nowMs: baseTime,
      });

      expect(result).toBe('');
    });

    it('returns latest past/current slot when not in auto-window mode', () => {
      const slots: AttendanceTimeslotConfig[] = [
        {
          slot_at: '2026-08-29T10:00:00Z',
          opens_at: null,
          closes_at: null,
        },
        {
          slot_at: '2026-08-29T12:00:00Z',
          opens_at: null,
          closes_at: null,
        },
        {
          slot_at: '2026-08-29T14:00:00Z',
          opens_at: null,
          closes_at: null,
        },
      ];

      const result = resolveSuggestedTimeslot({
        timeslotEnabled: true,
        timeslots: slots,
        autoWindowModeEnabled: false,
        activeTimeslot: null,
        nowMs: baseTime,
      });

      expect(result).toBe('2026-08-29T12:00:00Z');
    });

    it('returns first future slot if no past/current slots exist', () => {
      const slots: AttendanceTimeslotConfig[] = [
        {
          slot_at: '2026-08-29T13:00:00Z',
          opens_at: null,
          closes_at: null,
        },
        {
          slot_at: '2026-08-29T15:00:00Z',
          opens_at: null,
          closes_at: null,
        },
      ];

      const beforeAll = new Date('2026-08-29T11:00:00Z').getTime();

      const result = resolveSuggestedTimeslot({
        timeslotEnabled: true,
        timeslots: slots,
        autoWindowModeEnabled: false,
        activeTimeslot: null,
        nowMs: beforeAll,
      });

      expect(result).toBe('2026-08-29T13:00:00Z');
    });

    it('ignores slots with invalid timestamps', () => {
      const slots: AttendanceTimeslotConfig[] = [
        {
          slot_at: 'invalid',
          opens_at: null,
          closes_at: null,
        },
        {
          slot_at: '2026-08-29T13:00:00Z',
          opens_at: null,
          closes_at: null,
        },
      ];

      const result = resolveSuggestedTimeslot({
        timeslotEnabled: true,
        timeslots: slots,
        autoWindowModeEnabled: false,
        activeTimeslot: null,
        nowMs: baseTime,
      });

      expect(result).toBe('2026-08-29T13:00:00Z');
    });
  });
});
