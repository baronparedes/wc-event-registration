import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttendeeSearchResult, RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { DynamicFieldRef } from '@/lib/domain/attendance-views';
import { AttendanceDataMobileView } from '../AttendanceDataMobileView';

const sampleRegistrant: RegistrantAttendanceRow = {
  registration_id: 'reg-1',
  attendee_kind: 'member',
  member_id: 'm-1',
  nickname: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  check_in_status: 'checked_in',
  check_in_time: '2023-01-01T10:00:00Z',
  answers: [],
  created_at: '2023-01-01',
};

const sampleAttendee: AttendeeSearchResult = {
  registration_id: 'reg-1',
  attendee_kind: 'member',
  member_id: 'm-1',
  nickname: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  check_in_status: 'checked_in',
  check_in_time: '2023-01-01T10:00:00Z',
  answers: [],
  slot_records: [{ slot: '2026-07-25T10:00:00Z' }],
};

const visibleFields: DynamicFieldRef[] = [
  { source: 'member', fieldKey: 'avatar', label: 'Avatar' },
  { source: 'member', fieldKey: 'check_in_status', label: 'Status' },
  { source: 'member', fieldKey: 'email', label: 'Email' },
  { source: 'role', fieldKey: 'role', label: 'Role' },
  { source: 'member', fieldKey: 'member_id', label: 'Member ID' },
  { source: 'member', fieldKey: 'checked_in_slot', label: 'Slot' },
  { source: 'custom', fieldKey: 'color', label: 'Color', fieldType: 'color_picker' },
];

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AttendanceDataMobileView', () => {
  it('renders registrant card with compact member fields, slot labels and handles clicks', () => {
    const onViewRegistrant = vi.fn();
    const onEditRegistrant = vi.fn();
    const attendeesMap = new Map<string, AttendeeSearchResult>([['reg-1', sampleAttendee]]);

    const getVisibleFieldValue = vi.fn((_, field) => {
      if (field.fieldKey === 'role') return 'Volunteer';
      if (field.fieldKey === 'member_id') return 'MEM-001';
      if (field.fieldKey === 'checked_in_slot') return '10:00 AM, 11:00 AM';
      if (field.fieldKey === 'color') return '#00ff00';
      return '—';
    });

    renderWithQueryClient(
      <AttendanceDataMobileView
        registrants={[sampleRegistrant]}
        visibleFields={visibleFields}
        fields={[]}
        attendeesByRegistrantKey={attendeesMap}
        canWrite={true}
        fetchImage={true}
        onViewRegistrant={onViewRegistrant}
        onEditRegistrant={onEditRegistrant}
        countFilledAnswers={() => 0}
        getRegistrantKey={() => 'reg-1'}
        getVisibleFieldValue={getVisibleFieldValue}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
    expect(screen.getByText('MEM-001')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('11:00 AM')).toBeInTheDocument();

    const article = screen.getByText('John Doe').closest('article')!;
    fireEvent.click(article);
    expect(onViewRegistrant).toHaveBeenCalledWith(sampleRegistrant);

    const editBtn = screen.getByRole('button', { name: 'Fill in attendance details' });
    fireEvent.click(editBtn);
    expect(onEditRegistrant).toHaveBeenCalledWith(sampleRegistrant);
  });

  it('renders unchecked registrant with empty slot labels and canWrite false', () => {
    const uncheckedRegistrant: RegistrantAttendanceRow = {
      ...sampleRegistrant,
      check_in_status: 'not_checked_in',
    };

    const getVisibleFieldValue = vi.fn((_, field) => {
      if (field.fieldKey === 'checked_in_slot') return '—';
      return '—';
    });

    renderWithQueryClient(
      <AttendanceDataMobileView
        registrants={[uncheckedRegistrant]}
        visibleFields={visibleFields.filter((f) => f.fieldKey !== 'email')}
        fields={[]}
        attendeesByRegistrantKey={new Map()}
        canWrite={false}
        fetchImage={false}
        onViewRegistrant={vi.fn()}
        onEditRegistrant={vi.fn()}
        countFilledAnswers={() => 0}
        getRegistrantKey={() => 'reg-1'}
        getVisibleFieldValue={getVisibleFieldValue}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    expect(screen.getByTitle('Not Checked In')).toBeInTheDocument();
  });
});
