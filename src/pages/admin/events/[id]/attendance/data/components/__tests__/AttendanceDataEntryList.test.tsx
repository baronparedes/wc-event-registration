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
    render(
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={[]}
        fields={baseFields}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    expect(screen.getByText('No matching attendees')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your role, dynamic field, or grouping filters.'),
    ).toBeInTheDocument();
  });

  it('renders check-in status badge and hides attendance field columns', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'registered',
        registration_id: 'reg-1',
        public_registration_id: null,
        member_id: 'MID-001',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'Volunteer',
        category: 'North Team',
        check_in_status: 'checked_in',
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
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={registrants}
        fields={baseFields}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Check-In Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Table Number' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Area' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Notes' })).not.toBeInTheDocument();

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
    expect(screen.getByText('North Team')).toBeInTheDocument();
    expect(screen.getByLabelText('Checked In')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows not checked in badge for unknown check-in state and opens panel on row click', () => {
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

    render(
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={registrants}
        fields={[]}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    expect(screen.getByLabelText('Not Checked In')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: 'Fill In' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('John Smith'));

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('shows a guest note for public attendees', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'public',
        registration_id: null,
        public_registration_id: 'pub-1',
        member_id: null,
        full_name: 'Guest One',
        email: 'guest@example.com',
        role: null,
        category: null,
        check_in_status: 'not_checked_in',
        answers: [],
      },
    ];

    render(
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={registrants}
        fields={[]}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    expect(screen.getByText('Guest One')).toBeInTheDocument();
    expect(screen.getByText('Guest', { selector: 'p' })).toBeInTheDocument();
  });

  it('shows "Edit" button when attendance answers are filled', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'registered',
        registration_id: 'reg-3',
        public_registration_id: null,
        member_id: 'MID-003',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Staff',
        category: 'Team Lead',
        check_in_status: 'checked_in',
        answers: [
          {
            id: 'ans-3',
            registration_id: 'reg-3',
            public_registration_id: null,
            attendance_field_id: 'field-1',
            answer_text: '12',
            answer_number: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          },
          {
            id: 'ans-4',
            registration_id: 'reg-3',
            public_registration_id: null,
            attendance_field_id: 'field-2',
            answer_text: 'North',
            answer_number: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          },
        ],
      },
    ];

    render(
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={registrants}
        fields={baseFields}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('renders groups with labels and attendee counts', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'registered',
        registration_id: 'reg-4',
        public_registration_id: null,
        member_id: 'MID-004',
        full_name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'Volunteer',
        category: 'Team A',
        check_in_status: 'checked_in',
        answers: [],
      },
      {
        attendee_kind: 'registered',
        registration_id: 'reg-5',
        public_registration_id: null,
        member_id: 'MID-005',
        full_name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'Volunteer',
        category: 'Team B',
        check_in_status: 'not_checked_in',
        answers: [],
      },
    ];

    const groups = [
      {
        key: 'team-a',
        label: 'Team A Group',
        registrants: [registrants[0]],
      },
      {
        key: 'team-b',
        label: 'Team B Group',
        registrants: [registrants[1]],
      },
    ];

    render(
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={[]}
        groups={groups}
        fields={baseFields}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    expect(screen.getByText('Team A Group')).toBeInTheDocument();
    expect(screen.getByText('Team B Group')).toBeInTheDocument();
    expect(screen.getAllByText('1 attendee')).toHaveLength(2);
  });

  it('opens edit panel when Edit button is clicked', () => {
    const registrants: RegistrantAttendanceRow[] = [
      {
        attendee_kind: 'registered',
        registration_id: 'reg-6',
        public_registration_id: null,
        member_id: 'MID-006',
        full_name: 'Charlie Brown',
        email: 'charlie@example.com',
        role: 'Admin',
        category: 'Management',
        check_in_status: 'checked_in',
        answers: [
          {
            id: 'ans-5',
            registration_id: 'reg-6',
            public_registration_id: null,
            attendance_field_id: 'field-1',
            answer_text: 'Area A',
            answer_number: null,
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          },
        ],
      },
    ];

    render(
      <AttendanceDataEntryList
        eventId="event-1"
        registrants={registrants}
        fields={baseFields}
        allAttendees={[]}
        registrationFields={[]}
      />,
    );

    const editButton = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);

    expect(screen.getByText('Panel for Charlie Brown')).toBeInTheDocument();
  });
});
