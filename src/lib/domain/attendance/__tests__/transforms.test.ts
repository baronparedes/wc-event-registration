import { describe, expect, it } from 'vitest';

import {
  hasAnyActiveWindow,
  isAutoWindowModeEnabled,
  normalizeAttendanceTimeslots,
  resolveActiveTimeslot,
} from '@/lib/domain/attendance';

describe('attendance transforms', () => {
  it('normalizes legacy string timeslots into structured configs', () => {
    expect(normalizeAttendanceTimeslots(['2026-07-10T12:00:00+08:00', '  '])).toEqual([
      {
        slot_at: '2026-07-10T12:00:00+08:00',
        opens_at: null,
        closes_at: null,
      },
    ]);
  });

  it('normalizes structured timeslots, trims values, removes duplicates, and sorts by slot time', () => {
    expect(
      normalizeAttendanceTimeslots([
        {
          slot_at: ' 2026-07-10T13:00:00+08:00 ',
          opens_at: ' 2026-07-10T12:30:00+08:00 ',
          closes_at: ' 2026-07-10T13:30:00+08:00 ',
        },
        {
          slot_at: '2026-07-10T09:00:00+08:00',
          opens_at: null,
          closes_at: null,
        },
        {
          slot_at: '2026-07-10T13:00:00+08:00',
          opens_at: '2026-07-10T12:30:00+08:00',
          closes_at: '2026-07-10T13:30:00+08:00',
        },
      ]),
    ).toEqual([
      {
        slot_at: '2026-07-10T09:00:00+08:00',
        opens_at: null,
        closes_at: null,
      },
      {
        slot_at: '2026-07-10T13:00:00+08:00',
        opens_at: '2026-07-10T12:30:00+08:00',
        closes_at: '2026-07-10T13:30:00+08:00',
      },
    ]);
  });

  it('unwraps malformed stringified slot payloads and preserves nested window values', () => {
    expect(
      normalizeAttendanceTimeslots([
        {
          slot_at:
            '{"slot_at":"2026-08-30T09:00+08:00","opens_at":"2026-08-30T08:45+08:00","closes_at":"2026-08-30T09:30+08:00"}',
          opens_at: null,
          closes_at: null,
        },
      ]),
    ).toEqual([
      {
        slot_at: '2026-08-30T09:00+08:00',
        opens_at: '2026-08-30T08:45+08:00',
        closes_at: '2026-08-30T09:30+08:00',
      },
    ]);
  });

  it('enables auto-window mode only when timeslot attendance is enabled and a complete window exists', () => {
    expect(
      isAutoWindowModeEnabled({
        timeslot_enabled: true,
        timeslots: [
          {
            slot_at: '2026-07-10T13:00:00+08:00',
            opens_at: '2026-07-10T12:30:00+08:00',
            closes_at: '2026-07-10T13:30:00+08:00',
          },
        ],
      }),
    ).toBe(true);

    expect(
      isAutoWindowModeEnabled({
        timeslot_enabled: true,
        timeslots: [
          {
            slot_at: '2026-07-10T13:00:00+08:00',
            opens_at: null,
            closes_at: null,
          },
        ],
      }),
    ).toBe(false);
  });

  it('resolves the active timeslot when now is inside a configured window', () => {
    const slots = normalizeAttendanceTimeslots([
      {
        slot_at: '2026-07-10T09:00:00+08:00',
        opens_at: '2026-07-10T08:30:00+08:00',
        closes_at: '2026-07-10T09:30:00+08:00',
      },
      {
        slot_at: '2026-07-10T11:00:00+08:00',
        opens_at: '2026-07-10T10:30:00+08:00',
        closes_at: '2026-07-10T11:30:00+08:00',
      },
    ]);

    expect(resolveActiveTimeslot('2026-07-10T10:45:00+08:00', slots)).toEqual({
      slot_at: '2026-07-10T11:00:00+08:00',
      opens_at: '2026-07-10T10:30:00+08:00',
      closes_at: '2026-07-10T11:30:00+08:00',
    });
  });

  it('returns null when no active window exists', () => {
    const slots = normalizeAttendanceTimeslots([
      {
        slot_at: '2026-07-10T11:00:00+08:00',
        opens_at: '2026-07-10T10:30:00+08:00',
        closes_at: '2026-07-10T11:30:00+08:00',
      },
    ]);

    expect(resolveActiveTimeslot('2026-07-10T12:00:00+08:00', slots)).toBeNull();
    expect(hasAnyActiveWindow('2026-07-10T12:00:00+08:00', slots)).toBe(false);
  });
});
