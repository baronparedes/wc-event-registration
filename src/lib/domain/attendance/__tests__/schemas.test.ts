import { describe, expect, it } from 'vitest'
import {
  attendanceSlotPayloadSchema,
  buildTimeslotSelectionSchema,
  updateAttendanceSettingsSchema,
  walkInPayloadSchema,
} from '@/lib/domain/attendance'

describe('attendance schemas', () => {
  it('accepts valid update attendance settings input', () => {
    const parsed = updateAttendanceSettingsSchema.parse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      walk_in_mode_enabled: true,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
    })

    expect(parsed.attendance_enabled).toBe(true)
    expect(parsed.timeslots).toEqual(['2026-07-10T10:30+08:00'])
  })

  it('rejects enabling walk-in mode when attendance is disabled', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: false,
      walk_in_mode_enabled: true,
      timeslot_enabled: false,
      timeslots: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects enabling timeslot mode when attendance is disabled', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: false,
      walk_in_mode_enabled: false,
      timeslot_enabled: true,
      timeslots: ['2026-07-10T10:30+08:00'],
    })

    expect(result.success).toBe(false)
  })

  it('rejects timeslot mode with empty timeslots list', () => {
    const result = updateAttendanceSettingsSchema.safeParse({
      event_id: '11111111-1111-4111-8111-111111111111',
      attendance_enabled: true,
      walk_in_mode_enabled: false,
      timeslot_enabled: true,
      timeslots: [],
    })

    expect(result.success).toBe(false)
  })

  it('accepts walk-in payload when at least one contact method is provided', () => {
    const parsed = walkInPayloadSchema.parse({
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '',
    })

    expect(parsed.full_name).toBe('Jane Doe')
    expect(parsed.email).toBe('jane@example.com')
  })

  it('rejects walk-in payload when both email and phone are missing', () => {
    const result = walkInPayloadSchema.safeParse({
      full_name: 'Jane Doe',
      email: '',
      phone: '',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid walk-in phone format', () => {
    const result = walkInPayloadSchema.safeParse({
      full_name: 'Jane Doe',
      email: '',
      phone: '12345',
    })

    expect(result.success).toBe(false)
  })

  it('accepts configured timeslot selection and rejects unknown values', () => {
    const schema = buildTimeslotSelectionSchema(['9AM', '12NN'])

    expect(schema.safeParse({ slot: '9AM' }).success).toBe(true)
    expect(schema.safeParse({ slot: '3PM' }).success).toBe(false)
  })

  it('validates attendance slot payload bounds', () => {
    expect(attendanceSlotPayloadSchema.safeParse({ slot: '9AM' }).success).toBe(true)
    expect(attendanceSlotPayloadSchema.safeParse({ slot: '' }).success).toBe(false)
  })
})
