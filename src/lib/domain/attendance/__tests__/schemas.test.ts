import { describe, expect, it } from 'vitest';

import {
  attendanceSlotPayloadSchema,
  buildTimeslotSelectionSchema,
  updateAttendanceSettingsSchema,
} from '@/lib/domain/attendance';

describe('attendance schemas', () => {
  it('accepts valid update attendance settings input', () => {
    const parsed = updateAttendanceSettingsSchema.parse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: [
        {
          slot_at: '2026-07-10T10:30+08:00',
          opens_at: null,
          closes_at: null,
        },
      ],
    });

    expect(parsed.attendance_enabled).toBe(true);
    expect(parsed.enforce_check_in_event_window).toBe(true);
    expect(parsed.timeslots).toEqual([
      {
        slot_at: '2026-07-10T10:30+08:00',
        opens_at: null,
        closes_at: null,
      },
    ]);
  });

  it('defaults check-in event-window enforcement to true when omitted', () => {
    const parsed = updateAttendanceSettingsSchema.parse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      timeslot_enabled: false,
      timeslots: [],
    });

    expect(parsed.enforce_check_in_event_window).toBe(true);
  });

  it('rejects enabling timeslot mode when attendance is disabled', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: false,
      timeslot_enabled: true,
      timeslots: [
        {
          slot_at: '2026-07-10T10:30+08:00',
          opens_at: null,
          closes_at: null,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects timeslot mode with empty timeslots list', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts configured timeslot selection and rejects unknown values', () => {
    const schema = buildTimeslotSelectionSchema([
      { slot_at: '9AM', opens_at: null, closes_at: null },
      { slot_at: '', opens_at: null, closes_at: null },
      { slot_at: '12NN', opens_at: null, closes_at: null },
    ]);

    expect(schema.safeParse({ slot: '9AM' }).success).toBe(true);
    expect(schema.safeParse({ slot: ' 12NN ' }).success).toBe(true);
    expect(schema.safeParse({ slot: '3PM' }).success).toBe(false);
  });

  it('rejects partial timeslot windows', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: [
        {
          slot_at: '2026-07-10T10:30:00+08:00',
          opens_at: '2026-07-10T10:00:00+08:00',
          closes_at: null,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects slot windows where slot_at falls outside the window', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: [
        {
          slot_at: '2026-07-10T09:30:00+08:00',
          opens_at: '2026-07-10T10:00:00+08:00',
          closes_at: '2026-07-10T11:00:00+08:00',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects overlapping slot windows', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      timeslot_enabled: true,
      timeslots: [
        {
          slot_at: '2026-07-10T10:00:00+08:00',
          opens_at: '2026-07-10T09:00:00+08:00',
          closes_at: '2026-07-10T10:30:00+08:00',
        },
        {
          slot_at: '2026-07-10T10:45:00+08:00',
          opens_at: '2026-07-10T10:30:00+08:00',
          closes_at: '2026-07-10T11:30:00+08:00',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('validates attendance slot payload bounds', () => {
    expect(attendanceSlotPayloadSchema.safeParse({ slot: '9AM' }).success).toBe(true);
    expect(attendanceSlotPayloadSchema.safeParse({ slot: '' }).success).toBe(false);
    expect(attendanceSlotPayloadSchema.safeParse({ slot: 'x'.repeat(101) }).success).toBe(false);
  });
});
