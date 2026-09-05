import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttendeeSearchResult, RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { DynamicFieldRef } from '@/lib/domain/attendance-views';

import { AttendanceDataTableView } from '../AttendanceDataTableView';

const sampleRegistrant: RegistrantAttendanceRow = {
  registration_id: 'reg-1',
  public_registration_id: null,
  attendee_kind: 'registered',
  member_id: 'm-1',
  nickname: 'Jane',
  last_name: 'Doe',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  check_in_status: 'checked_in',
  answers: [],
};

const sampleAttendee: AttendeeSearchResult = {
  registration_id: 'reg-1',
  public_registration_id: null,
  user_id: 'u-1',
  attendee_kind: 'registered',
  member_id: 'm-1',
  nickname: 'Jane',
  last_name: 'Doe',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'member',
  category: 'adult',
  registration_status: 'submitted',
  submitted_at: '2023-01-01T10:00:00Z',
  check_in_status: 'checked_in',
  official_check_in_time: '2023-01-01T10:00:00Z',
  registration_answers: [],
  attendance_answers: [],
  slot_records: [{ slot: '2026-07-25T10:00:00Z', recorded_at: '2026-07-25T10:00:00Z' }],
  avatar_object_key: 'avatar.png',
};

const fields: AttendanceField[] = [];
const visibleFields: DynamicFieldRef[] = [
  { source: 'member', fieldKey: 'avatar', label: 'Avatar', fieldType: 'text' },
  { source: 'member', fieldKey: 'check_in_status', label: 'Status', fieldType: 'text' },
  { source: 'member', fieldKey: 'member_id', label: 'Member ID', fieldType: 'text' },
  { source: 'member', fieldKey: 'checked_in_slot', label: 'Slot', fieldType: 'text' },
  { source: 'attendance', fieldKey: 'favorite_color', label: 'Color', fieldType: 'color_picker' },
];

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AttendanceDataTableView', () => {
  it('renders correctly and handles interactions', () => {
    const onViewRegistrant = vi.fn();
    const onEditRegistrant = vi.fn();
    const countFilledAnswers = vi.fn().mockReturnValue(1);
    const getRegistrantKey = vi.fn().mockReturnValue('m-1');
    const getVisibleFieldValue = vi.fn((_, field) => {
      if (field.fieldKey === 'member_id') return 'MEM-001';
      if (field.fieldKey === 'favorite_color') return '#ff0000';
      return '';
    });

    const attendeesMap = new Map<string, AttendeeSearchResult>();
    attendeesMap.set('m-1', sampleAttendee);

    renderWithQueryClient(
      <AttendanceDataTableView
        registrants={[sampleRegistrant]}
        visibleFields={visibleFields}
        fields={fields}
        attendeesByRegistrantKey={attendeesMap}
        canWrite={true}
        fetchImage={true}
        onViewRegistrant={onViewRegistrant}
        onEditRegistrant={onEditRegistrant}
        countFilledAnswers={countFilledAnswers}
        getRegistrantKey={getRegistrantKey}
        getVisibleFieldValue={getVisibleFieldValue}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('MEM-001')).toBeInTheDocument();

    const row = screen.getByText('Jane Doe').closest('tr')!;
    fireEvent.click(row);
    expect(onViewRegistrant).toHaveBeenCalledWith(sampleRegistrant);

    const editBtn = screen.getByRole('button', { name: 'Edit attendance details' });
    fireEvent.click(editBtn);
    expect(onEditRegistrant).toHaveBeenCalledWith(sampleRegistrant);
  });

  it('renders unchecked registrant without avatar and canWrite false', () => {
    const uncheckedRegistrant: RegistrantAttendanceRow = {
      ...sampleRegistrant,
      check_in_status: 'not_checked_in',
    };
    const onViewRegistrant = vi.fn();
    const onEditRegistrant = vi.fn();
    const countFilledAnswers = vi.fn().mockReturnValue(0);
    const getRegistrantKey = vi.fn().mockReturnValue('m-1');
    const getVisibleFieldValue = vi.fn().mockReturnValue('Val');

    const attendeesMap = new Map<string, AttendeeSearchResult>();

    renderWithQueryClient(
      <AttendanceDataTableView
        registrants={[uncheckedRegistrant]}
        visibleFields={visibleFields.filter((f) => f.fieldKey !== 'avatar')}
        fields={fields}
        attendeesByRegistrantKey={attendeesMap}
        canWrite={false}
        fetchImage={false}
        onViewRegistrant={onViewRegistrant}
        onEditRegistrant={onEditRegistrant}
        countFilledAnswers={countFilledAnswers}
        getRegistrantKey={getRegistrantKey}
        getVisibleFieldValue={getVisibleFieldValue}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByTitle('Not Checked In')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /attendance details/ })).not.toBeInTheDocument();
  });
});
