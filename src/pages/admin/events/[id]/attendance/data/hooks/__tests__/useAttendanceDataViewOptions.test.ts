import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';
import { useAttendanceDataViewOptions } from '../useAttendanceDataViewOptions';

const sampleAttendee: AttendeeSearchResult = {
  registration_id: 'r1',
  attendee_kind: 'member',
  member_id: 'M1',
  nickname: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  role: 'Leader',
  category: 'Adult',
  check_in_status: 'checked_in',
  check_in_time: '2025-01-01',
  answers: [],
  registration_answers: [],
  attendance_answers: [],
};

const regField: AdminEventField = {
  id: 'rf1',
  event_id: 'e1',
  field_key: 'team',
  label: 'Team',
  field_type: 'text',
  applicability: 'both',
  is_required: false,
  is_active: true,
  placeholder: null,
  help_text: null,
  options: [],
  validation_rules: {},
  display_order: 0,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

const attField: AttendanceField = {
  id: 'af1',
  event_id: 'e1',
  field_key: 'table',
  label: 'Table',
  field_type: 'number',
  is_required: false,
  is_active: true,
  display_order: 1,
  options: [],
  validation_rules: {},
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

describe('useAttendanceDataViewOptions', () => {
  it('extracts options, seeded fields, and unique role/category values', () => {
    const { result } = renderHook(() =>
      useAttendanceDataViewOptions({
        attendees: [sampleAttendee],
        attendanceFields: [attField],
        registrationFields: [regField],
      }),
    );

    expect(result.current.roleOptions).toEqual(['Leader']);
    expect(result.current.categoryOptions).toEqual(['Adult']);
    expect(result.current.registrationDynamicFieldOptions).toHaveLength(1);
    expect(result.current.attendanceDynamicFieldOptions).toHaveLength(1);
    expect(result.current.memberDynamicFieldOptions.length).toBeGreaterThan(0);
  });
});
