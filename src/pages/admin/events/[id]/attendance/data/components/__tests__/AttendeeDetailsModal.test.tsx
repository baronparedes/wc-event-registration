import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';
import { AttendeeDetailsModal } from '@/pages/admin/events/[id]/attendance/data/components/AttendeeDetailsModal';

describe('AttendeeDetailsModal', () => {
  const mockOnClose = vi.fn();

  const baseRegistrant: RegistrantAttendanceRow = {
    attendee_kind: 'registered',
    registration_id: 'reg-1',
    public_registration_id: null,
    member_id: 'MID-001',
    full_name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    category: 'staff',
    check_in_status: 'not_checked_in',
    answers: [],
  };

  const baseRegistrationField: AdminEventField = {
    id: 'rf-1',
    event_id: 'evt-1',
    field_key: 'diet',
    label: 'Dietary Preference',
    field_type: 'select',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    display_order: 1,
    options: [],
    validation_rules: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const baseAttendanceField: AttendanceField = {
    id: 'af-1',
    event_id: 'evt-1',
    field_key: 'notes',
    label: 'Notes',
    field_type: 'textarea',
    is_required: false,
    is_active: true,
    display_order: 1,
    options: [],
    validation_rules: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('returns null when registrant is null', () => {
    const { container } = render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={null}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AttendeeDetailsModal
        isOpen={false}
        registrant={baseRegistrant}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    // Dialog creates a portal only when isOpen is true
    expect(container.innerHTML).toBe('');
  });

  it('displays attendee header info when modal is open', () => {
    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={baseRegistrant}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Member ID: MID-001')).toBeInTheDocument();
    expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Role: admin')).toBeInTheDocument();
    expect(screen.getByText('Category: staff')).toBeInTheDocument();
  });

  it('displays checked in status badge', () => {
    const checkedInRegistrant = { ...baseRegistrant, check_in_status: 'checked_in' as const };

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={checkedInRegistrant}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Checked In')).toBeInTheDocument();
  });

  it('displays not checked in status badge', () => {
    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={baseRegistrant}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Not Checked In')).toBeInTheDocument();
  });

  it('hides member id email role category when not present', () => {
    const minimalRegistrant: RegistrantAttendanceRow = {
      ...baseRegistrant,
      member_id: null,
      email: null,
      role: null,
      category: null,
    };

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={minimalRegistrant}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Member ID: Guest')).toBeInTheDocument();
    expect(screen.queryByText(/Email:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Role:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Category:/)).not.toBeInTheDocument();
  });

  it('displays registration answers with labels and text', () => {
    const registrationAnswers = [
      {
        event_field_id: 'rf-1',
        field_type: 'select',
        label: 'Dietary Preference',
        answer_text: 'vegetarian',
        answer_number: null,
      },
    ];

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={baseRegistrant}
        attendanceFields={[]}
        registrationFields={[baseRegistrationField]}
        registrationAnswers={registrationAnswers}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Registration answers')).toBeInTheDocument();
    expect(screen.getByText('Dietary Preference')).toBeInTheDocument();
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
  });

  it('displays attendance answers with labels and text', () => {
    const attendanceFieldWithAnswer: AttendanceField = {
      ...baseAttendanceField,
      id: 'af-1',
    };

    const registrantWithAnswers: RegistrantAttendanceRow = {
      ...baseRegistrant,
      answers: [
        {
          id: 'ans-1',
          registration_id: 'reg-1',
          public_registration_id: null,
          attendance_field_id: 'af-1',
          answer_text: 'arrived early',
          answer_number: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    };

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={registrantWithAnswers}
        attendanceFields={[attendanceFieldWithAnswer]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Attendance Data')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('arrived early')).toBeInTheDocument();
  });

  it('shows empty attendance data message when no answers', () => {
    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={baseRegistrant}
        attendanceFields={[baseAttendanceField]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('No attendance data recorded yet.')).toBeInTheDocument();
  });

  it('parses multi_select JSON answers', () => {
    const multiSelectField: AttendanceField = {
      ...baseAttendanceField,
      id: 'af-multi',
      field_type: 'multi_select',
      label: 'Preferences',
    };

    const registrantWithMultiSelect: RegistrantAttendanceRow = {
      ...baseRegistrant,
      answers: [
        {
          id: 'ans-1',
          registration_id: 'reg-1',
          public_registration_id: null,
          attendance_field_id: 'af-multi',
          answer_text: '["vegan","gluten-free"]',
          answer_number: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    };

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={registrantWithMultiSelect}
        attendanceFields={[multiSelectField]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('vegan, gluten-free')).toBeInTheDocument();
  });

  it('displays numeric answers', () => {
    const numericField: AttendanceField = {
      ...baseAttendanceField,
      id: 'af-numeric',
      field_type: 'number',
      label: 'Guests',
    };

    const registrantWithNumeric: RegistrantAttendanceRow = {
      ...baseRegistrant,
      answers: [
        {
          id: 'ans-1',
          registration_id: 'reg-1',
          public_registration_id: null,
          attendance_field_id: 'af-numeric',
          answer_text: null,
          answer_number: 3,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    };

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={registrantWithNumeric}
        attendanceFields={[numericField]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('filters out empty answers with null text and number', () => {
    const emptyAnswerField: AttendanceField = {
      ...baseAttendanceField,
      id: 'af-empty',
    };

    const registrantWithEmptyAnswer: RegistrantAttendanceRow = {
      ...baseRegistrant,
      answers: [
        {
          id: 'ans-1',
          registration_id: 'reg-1',
          public_registration_id: null,
          attendance_field_id: 'af-empty',
          answer_text: null,
          answer_number: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    };

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={registrantWithEmptyAnswer}
        attendanceFields={[emptyAnswerField]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    // Empty answers are filtered out, so we should see the empty state message
    expect(screen.getByText('No attendance data recorded yet.')).toBeInTheDocument();
  });

  it('displays Close button', () => {
    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={baseRegistrant}
        attendanceFields={[]}
        registrationFields={[]}
        registrationAnswers={[]}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('filters out empty registration answers', () => {
    const registrationAnswers = [
      {
        event_field_id: 'rf-1',
        field_type: 'text',
        label: 'Name',
        answer_text: null,
        answer_number: null,
      },
      {
        event_field_id: 'rf-2',
        field_type: 'select',
        label: 'Diet',
        answer_text: 'vegetarian',
        answer_number: null,
      },
    ];

    const registrationFields = [baseRegistrationField, { ...baseRegistrationField, id: 'rf-2' }];

    render(
      <AttendeeDetailsModal
        isOpen={true}
        registrant={baseRegistrant}
        attendanceFields={[]}
        registrationFields={registrationFields}
        registrationAnswers={registrationAnswers}
        onClose={mockOnClose}
      />,
    );

    // Should show 'Diet' answer but not 'Name'
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
  });
});
