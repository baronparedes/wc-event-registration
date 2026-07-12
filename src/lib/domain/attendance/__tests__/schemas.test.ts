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
      offline_check_in_queue_enabled: true,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
    });

    expect(parsed.attendance_enabled).toBe(true);
    expect(parsed.enforce_check_in_event_window).toBe(true);
    expect(parsed.timeslots).toEqual(['2026-07-10T10:30+08:00']);
  });

  it('defaults check-in event-window enforcement to true when omitted', () => {
    const parsed = updateAttendanceSettingsSchema.parse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      offline_check_in_queue_enabled: false,
      timeslot_enabled: false,
      timeslots: [],
    });

    expect(parsed.enforce_check_in_event_window).toBe(true);
  });

  it('rejects enabling timeslot mode when attendance is disabled', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: false,
      offline_check_in_queue_enabled: false,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects timeslot mode with empty timeslots list', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      offline_check_in_queue_enabled: false,
      timeslot_enabled: true,
      timeslots: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts configured timeslot selection and rejects unknown values', () => {
    const schema = buildTimeslotSelectionSchema(['9AM', '', '12NN']);

    expect(schema.safeParse({ slot: '9AM' }).success).toBe(true);
    expect(schema.safeParse({ slot: ' 12NN ' }).success).toBe(true);
    expect(schema.safeParse({ slot: '3PM' }).success).toBe(false);
  });

  it('validates attendance slot payload bounds', () => {
    expect(attendanceSlotPayloadSchema.safeParse({ slot: '9AM' }).success).toBe(true);
    expect(attendanceSlotPayloadSchema.safeParse({ slot: '' }).success).toBe(false);
    expect(attendanceSlotPayloadSchema.safeParse({ slot: 'x'.repeat(101) }).success).toBe(false);
  });
});
