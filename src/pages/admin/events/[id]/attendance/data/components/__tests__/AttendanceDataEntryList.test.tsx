import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { AttendanceDataEntryList } from '@/pages/admin/events/[id]/attendance/data/components/AttendanceDataEntryList';

vi.mock('@/pages/admin/events/[id]/attendance/data/components/AttendanceDataEntryPanel', () => ({
  AttendanceDataEntryPanel: ({ registrant }: { registrant: { full_name: string } }) => (
    <div>Panel for {registrant.full_name}</div>
  ),
}));

const baseFields: AttendanceField[] = [
  {
    id: 'field-1',
    event_id: 'event-1',
    field_key: 'table',
    label: 'Table Number',
    field_type: 'text',
    is_required: false,
    is_active: true,
    display_order: 0,
    options: [],
    validation_rules: {},
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'field-2',
    event_id: 'event-1',
    field_key: 'area',
    label: 'Area',
    field_type: 'text',
    is_required: false,
    is_active: true,
    display_order: 1,
    options: [],
    validation_rules: {},
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'field-3',
    event_id: 'event-1',
    field_key: 'notes',
    label: 'Notes',
    field_type: 'textarea',
    is_required: false,
    is_active: true,
    display_order: 2,
    options: [],
    validation_rules: {},
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'field-4',
    event_id: 'event-1',
    field_key: 'section',
    label: 'Section',
    field_type: 'text',
    is_required: false,
    is_active: true,
    display_order: 3,
    options: [],
    validation_rules: {},
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
];

describe('AttendanceDataEntryList', () => {
  it('renders empty state when there are no registrants', () => {
    render(<AttendanceDataEntryList eventId="event-1" registrants={[]} fields={baseFields} />);

    expect(screen.getByText('No matching attendees')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your role, dynamic field, or grouping filters.'),
    ).toBeInTheDocument();
  });

  it('renders field columns, ellipsis column, and answer/progress values', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'registered',
        registration_id: 'reg-1',
        public_registration_id: null,
        member_id: 'MID-001',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        answers: [
          {
            id: 'ans-1',
            registration_id: 'reg-1',
            public_registration_id: null,
            attendance_field_id: 'field-1',
            answer_text: '50',
            answer_number: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          },
          {
            id: 'ans-2',
            registration_id: 'reg-1',
            public_registration_id: null,
            attendance_field_id: 'field-2',
            answer_text: null,
            answer_number: 2,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          },
        ],
      },
    ];

    render(
      <AttendanceDataEntryList eventId="event-1" registrants={registrants} fields={baseFields} />,
    );

    expect(screen.getByRole('columnheader', { name: 'Table Number' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Area' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '…' })).toBeInTheDocument();

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows N/A progress for zero fields and opens panel on row click', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'registered',
        registration_id: 'reg-2',
        public_registration_id: null,
        member_id: 'MID-002',
        full_name: 'John Smith',
        email: null,
        answers: [],
      },
    ];

    render(<AttendanceDataEntryList eventId="event-1" registrants={registrants} fields={[]} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fill In' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('John Smith'));

    expect(screen.getByText('Panel for John Smith')).toBeInTheDocument();
  });
});
