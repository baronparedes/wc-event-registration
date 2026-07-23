import { describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import { buildAttendanceViewCsvExport } from '../export';
import type { AttendeeViewConfig } from '../types';

function makeAttendee(overrides: Partial<AttendeeSearchResult>): AttendeeSearchResult {
  return {
    attendee_kind: 'registered',
    registration_id: 'reg-1',
    public_registration_id: null,
    user_id: 'user-1',
    member_id: 'MID-001',
    nickname: 'Alpha',
    last_name: 'Member',
    full_name: 'Alpha Member',
    email: 'alpha@example.com',
    role: 'Member',
    category: 'Adult',
    registration_status: 'submitted',
    submitted_at: '2026-07-22T00:00:00.000Z',
    check_in_status: 'not_checked_in',
    official_check_in_time: null,
    registration_answers: [],
    attendance_answers: [],
    ...overrides,
  };
}

const defaultVisibleFields: AttendeeViewConfig['visibleFields'] = [];

describe('attendance-views export', () => {
  it('builds csv and filename for grouped registered and public attendees', () => {
    const registered = makeAttendee({
      attendee_kind: 'registered',
      registration_id: 'reg-100',
      member_id: 'MID-100',
      full_name: 'Registered Person',
      email: 'registered@example.com',
      role: 'Member',
      category: 'Adult',
      check_in_status: 'checked_in',
      official_check_in_time: '2026-07-22T10:00:00.000Z',
    });

    const publicAttendee = makeAttendee({
      attendee_kind: 'public',
      registration_id: 'fallback-public-reg',
      public_registration_id: 'pub-200',
      member_id: null,
      full_name: 'Public Person',
      email: 'public@example.com',
      role: null,
      category: null,
      check_in_status: 'not_checked_in',
      official_check_in_time: null,
    });

    const result = buildAttendanceViewCsvExport({
      eventId: 'event-1',
      filteredAttendees: [registered, publicAttendee],
      groups: [
        {
          key: 'all',
          label: 'All attendees',
          registrants: [
            {
              attendee_kind: 'registered',
              registration_id: 'reg-100',
              public_registration_id: null,
              member_id: 'MID-100',
              nickname: 'Registered',
              last_name: 'Person',
              full_name: 'Registered Person',
              email: 'registered@example.com',
              role: 'Member',
              category: 'Adult',
              check_in_status: 'checked_in',
              answers: [],
            },
            {
              attendee_kind: 'public',
              registration_id: null,
              public_registration_id: 'pub-200',
              member_id: null,
              nickname: 'Public',
              last_name: 'Person',
              full_name: 'Public Person',
              email: 'public@example.com',
              role: null,
              category: null,
              check_in_status: 'not_checked_in',
              answers: [],
            },
          ],
        },
      ],
      visibleFields: defaultVisibleFields,
      now: new Date('2026-07-22T12:34:56.789Z'),
    });

    expect(result.filename).toBe('event-event-1-attendance-view-2026-07-22T12-34-56-789Z.csv');

    const lines = result.csvText.split('\n');

    expect(lines[0]).toBe(
      'group,attendee_kind,registration_id,public_registration_id,member_id,full_name,email,role,category,check_in_status,official_check_in_time',
    );
    expect(lines[1]).toBe(
      'All attendees,registered,reg-100,,MID-100,Registered Person,registered@example.com,Member,Adult,checked_in,2026-07-22T10:00:00.000Z',
    );
    expect(lines[2]).toBe(
      'All attendees,public,,pub-200,,Public Person,public@example.com,,,not_checked_in,',
    );
  });

  it('includes only registration and attendance visible fields in csv columns', () => {
    const attendee = makeAttendee({
      registration_id: 'reg-101',
      registration_answers: [
        {
          event_field_id: 'ef-service',
          field_type: 'select',
          field_key: 'service',
          label: 'Service',
          answer_text: '9AM',
          answer_number: null,
        },
      ],
      attendance_answers: [
        {
          attendance_field_id: 'af-area',
          field_type: 'select',
          field_key: 'area',
          label: 'Area',
          answer_text: 'North',
          answer_number: null,
        },
      ],
    });

    const result = buildAttendanceViewCsvExport({
      eventId: 'event-2',
      filteredAttendees: [attendee],
      groups: [
        {
          key: 'all',
          label: 'All attendees',
          registrants: [
            {
              attendee_kind: 'registered',
              registration_id: 'reg-101',
              public_registration_id: null,
              member_id: 'MID-001',
              nickname: 'Alpha',
              last_name: 'Member',
              full_name: 'Alpha Member',
              email: 'alpha@example.com',
              role: 'Member',
              category: 'Adult',
              check_in_status: 'not_checked_in',
              answers: [],
            },
          ],
        },
      ],
      visibleFields: [
        { source: 'registration', fieldKey: 'service', label: 'Service' },
        { source: 'attendance', fieldKey: 'area', label: 'Area' },
        { source: 'role', fieldKey: 'role', label: 'Role View Field' },
      ],
      now: new Date('2026-07-22T00:00:00.000Z'),
    });

    const lines = result.csvText.split('\n');
    expect(lines[0]).toBe(
      'group,attendee_kind,registration_id,public_registration_id,member_id,full_name,email,role,category,check_in_status,official_check_in_time,Service,Area',
    );
    expect(lines[1]).toContain(',9AM,North');
    expect(lines[0]).not.toContain('Role View Field');
  });

  it('escapes csv values with commas, quotes, and new lines', () => {
    const attendee = makeAttendee({
      registration_id: 'reg-quote',
      full_name: 'Quoted "Name"',
      email: 'comma@example.com',
      registration_answers: [
        {
          event_field_id: 'ef-note',
          field_type: 'text',
          field_key: 'note',
          label: 'Note',
          answer_text: 'Line 1\nLine 2, with comma',
          answer_number: null,
        },
      ],
    });

    const result = buildAttendanceViewCsvExport({
      eventId: 'event-3',
      filteredAttendees: [attendee],
      groups: [
        {
          key: 'all',
          label: 'All, attendees',
          registrants: [
            {
              attendee_kind: 'registered',
              registration_id: 'reg-quote',
              public_registration_id: null,
              member_id: 'MID-001',
              nickname: 'Quoted',
              last_name: 'Name',
              full_name: 'Quoted "Name"',
              email: 'comma@example.com',
              role: 'Member',
              category: 'Adult',
              check_in_status: 'not_checked_in',
              answers: [],
            },
          ],
        },
      ],
      visibleFields: [{ source: 'registration', fieldKey: 'note', label: 'Note' }],
      now: new Date('2026-07-22T00:00:00.000Z'),
    });

    expect(result.csvText).toContain('"All, attendees"');
    expect(result.csvText).toContain('"Quoted ""Name"""');
    expect(result.csvText).toContain('"Line 1\nLine 2, with comma"');
  });

  it('falls back to empty official check-in time when attendee is missing from filtered list', () => {
    const result = buildAttendanceViewCsvExport({
      eventId: 'event-4',
      filteredAttendees: [],
      groups: [
        {
          key: 'all',
          label: 'All attendees',
          registrants: [
            {
              attendee_kind: 'registered',
              registration_id: 'reg-missing',
              public_registration_id: null,
              member_id: 'MID-999',
              nickname: 'Missing',
              last_name: 'Person',
              full_name: 'Missing Person',
              email: null,
              role: null,
              category: null,
              check_in_status: 'not_checked_in',
              answers: [],
            },
          ],
        },
      ],
      visibleFields: defaultVisibleFields,
      now: new Date('2026-07-22T00:00:00.000Z'),
    });

    const lines = result.csvText.split('\n');
    expect(lines[1]).toBe(
      'All attendees,registered,reg-missing,,MID-999,Missing Person,,,,not_checked_in,',
    );
  });
});
