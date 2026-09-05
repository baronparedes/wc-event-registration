import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttendeeSearchResult, RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { DynamicFieldRef } from '@/lib/domain/attendance-views';
import { AttendanceDataCardView } from '../AttendanceDataCardView';

const sampleRegistrant: RegistrantAttendanceRow = {
  registration_id: 'reg-1',
  attendee_kind: 'member',
  member_id: 'm-1',
  nickname: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  check_in_status: 'checked_in',
  check_in_time: '2023-01-01T10:00:00Z',
  answers: [],
  created_at: '2023-01-01',
};

const sampleAttendee: AttendeeSearchResult = {
  registration_id: 'reg-1',
  attendee_kind: 'member',
  member_id: 'm-1',
  nickname: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
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

describe('AttendanceDataCardView', () => {
  it('renders card view with compact fields and remaining fields', () => {
    const onViewRegistrant = vi.fn();
    const onEditRegistrant = vi.fn();
    const attendeesMap = new Map<string, AttendeeSearchResult>([['reg-1', sampleAttendee]]);

    const getVisibleFieldValue = vi.fn((_, field) => {
      if (field.fieldKey === 'role') return 'Leader';
      if (field.fieldKey === 'member_id') return 'MEM-002';
      if (field.fieldKey === 'color') return '#0000ff';
      return '—';
    });

    renderWithQueryClient(
      <AttendanceDataCardView
        registrants={[sampleRegistrant]}
        visibleFields={visibleFields}
        fields={[]}
        attendeesByRegistrantKey={attendeesMap}
        canWrite={true}
        fetchImage={true}
        onViewRegistrant={onViewRegistrant}
        onEditRegistrant={onEditRegistrant}
        countFilledAnswers={() => 1}
        getRegistrantKey={() => 'reg-1'}
        getVisibleFieldValue={getVisibleFieldValue}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
    expect(screen.getByText('MEM-002')).toBeInTheDocument();

    const card = screen.getByText('Jane Doe').closest('article')!;
    fireEvent.click(card);
    expect(onViewRegistrant).toHaveBeenCalledWith(sampleRegistrant);

    const editBtn = screen.getByRole('button', { name: 'Edit attendance details' });
    fireEvent.click(editBtn);
    expect(onEditRegistrant).toHaveBeenCalledWith(sampleRegistrant);
  });
});
