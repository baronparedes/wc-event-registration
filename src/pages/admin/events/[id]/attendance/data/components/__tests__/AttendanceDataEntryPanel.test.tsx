import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { AttendanceDataEntryPanel } from '@/pages/admin/events/[id]/attendance/data/components/AttendanceDataEntryPanel';

const { mockMutateAsync, mockToast, mockMutationState } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn().mockResolvedValue(1),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockMutationState: {
    isPending: false,
  },
}));

vi.mock('@/hooks/domain/attendance', () => ({
  useUpsertAttendanceAnswersMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockMutationState.isPending,
  }),
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

describe('AttendanceDataEntryPanel', () => {
  const registrant: RegistrantAttendanceRow = {
    attendee_kind: 'registered',
    registration_id: 'reg-1',
    public_registration_id: null,
    member_id: 'member-1',
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    answers: [
      {
        id: 'ans-1',
        registration_id: 'reg-1',
        public_registration_id: null,
        attendance_field_id: 'field-multi',
        answer_text: '["veg","vip"]',
        answer_number: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ],
  };

  const fields: AttendanceField[] = [
    {
      id: 'field-multi',
      event_id: 'event-1',
      field_key: 'meal_preferences',
      label: 'Meal Preferences',
      field_type: 'multi_select',
      is_required: false,
      is_active: true,
      display_order: 0,
      options: [
        { label: 'Vegetarian', value: 'veg' },
        { label: 'VIP', value: 'vip' },
        { label: 'Kosher', value: 'kosher' },
      ],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationState.isPending = false;
  });

  it('renders multi-select field as a multiple select and preloads selected values', () => {
    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={registrant}
        fields={fields}
        onClose={() => {}}
      />,
    );

    const select = screen.getByLabelText('Meal Preferences') as HTMLSelectElement;
    expect(select.multiple).toBe(true);

    const vegetarianOption = screen.getByRole('option', {
      name: 'Vegetarian',
    }) as HTMLOptionElement;
    const vipOption = screen.getByRole('option', { name: 'VIP' }) as HTMLOptionElement;
    const kosherOption = screen.getByRole('option', { name: 'Kosher' }) as HTMLOptionElement;

    expect(vegetarianOption.selected).toBe(true);
    expect(vipOption.selected).toBe(true);
    expect(kosherOption.selected).toBe(false);
  });

  it('serializes multi-select selections as JSON in answer_text on submit', async () => {
    const onClose = vi.fn();

    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={registrant}
        fields={fields}
        onClose={onClose}
      />,
    );

    const select = screen.getByLabelText('Meal Preferences') as HTMLSelectElement;

    for (const option of Array.from(select.options)) {
      option.selected = option.value === 'kosher' || option.value === 'vip';
    }

    fireEvent.change(select);
    fireEvent.click(screen.getByRole('button', { name: 'Save Data' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockMutateAsync.mock.calls[0]?.[0];
    expect(payload.event_id).toBe('event-1');
    expect(payload.attendee_kind).toBe('registered');
    expect(payload.registration_id).toBe('reg-1');
    expect(payload.public_registration_id).toBeUndefined();
    expect(payload.answers).toHaveLength(1);
    expect(payload.answers[0].attendance_field_id).toBe('field-multi');
    expect(payload.answers[0].answer_number).toBeNull();
    expect(JSON.parse(payload.answers[0].answer_text)).toEqual(
      expect.arrayContaining(['vip', 'kosher']),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('maps mixed field types to the expected mutation payload values', async () => {
    const onClose = vi.fn();

    const mixedRegistrant: RegistrantAttendanceRow = {
      attendee_kind: 'registered',
      registration_id: 'reg-2',
      public_registration_id: null,
      member_id: '',
      full_name: 'John Smith',
      email: null,
      answers: [
        {
          id: 'ans-multi-invalid',
          registration_id: 'reg-2',
          public_registration_id: null,
          attendance_field_id: 'field-multi-bad',
          answer_text: 'not-json',
          answer_number: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        {
          id: 'ans-number',
          registration_id: 'reg-2',
          public_registration_id: null,
          attendance_field_id: 'field-number',
          answer_text: null,
          answer_number: 42,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    };

    const mixedFields: AttendanceField[] = [
      {
        id: 'field-text',
        event_id: 'event-1',
        field_key: 'text_note',
        label: 'Text Note',
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
        id: 'field-number',
        event_id: 'event-1',
        field_key: 'badge_count',
        label: 'Badge Count',
        field_type: 'number',
        is_required: false,
        is_active: true,
        display_order: 1,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-multi-bad',
        event_id: 'event-1',
        field_key: 'shifts',
        label: 'Shifts',
        field_type: 'multi_select',
        is_required: false,
        is_active: true,
        display_order: 2,
        options: [
          { label: 'Morning', value: 'morning' },
          { label: 'Evening', value: 'evening' },
        ],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-boolean',
        event_id: 'event-1',
        field_key: 'consent',
        label: 'Consent',
        field_type: 'boolean',
        is_required: false,
        is_active: true,
        display_order: 3,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-email',
        event_id: 'event-1',
        field_key: 'contact_email',
        label: 'Contact Email',
        field_type: 'email',
        is_required: false,
        is_active: true,
        display_order: 4,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-date',
        event_id: 'event-1',
        field_key: 'arrival_date',
        label: 'Arrival Date',
        field_type: 'date',
        is_required: false,
        is_active: true,
        display_order: 5,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-datetime',
        event_id: 'event-1',
        field_key: 'check_in_time',
        label: 'Check In Time',
        field_type: 'datetime',
        is_required: false,
        is_active: true,
        display_order: 6,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={mixedRegistrant}
        fields={mixedFields}
        onClose={onClose}
      />,
    );

    const numberInput = screen.getByLabelText('Badge Count') as HTMLInputElement;
    expect(numberInput.value).toBe('42');

    const multiSelect = screen.getByLabelText('Shifts') as HTMLSelectElement;
    const morningOption = screen.getByRole('option', { name: 'Morning' }) as HTMLOptionElement;
    expect(multiSelect.multiple).toBe(true);
    expect(morningOption.selected).toBe(false);

    fireEvent.change(screen.getByLabelText('Text Note'), { target: { value: '   ' } });
    fireEvent.change(numberInput, { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Contact Email'), {
      target: { value: 'staff@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Arrival Date'), { target: { value: '2026-09-15' } });
    fireEvent.change(screen.getByLabelText('Check In Time'), {
      target: { value: '2026-09-15T08:30' },
    });
    const form = screen.getByRole('button', { name: 'Save Data' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockMutateAsync.mock.calls[0]?.[0];
    expect(payload.answers).toHaveLength(mixedFields.length);

    const answerByFieldId = new Map(
      payload.answers.map(
        (answer: {
          attendance_field_id: string;
          answer_text: string | null;
          answer_number: number | null;
        }) => [answer.attendance_field_id, answer],
      ),
    );

    expect(answerByFieldId.get('field-text')).toMatchObject({
      answer_text: null,
      answer_number: null,
    });
    expect(answerByFieldId.get('field-number')).toMatchObject({
      answer_text: null,
      answer_number: 7,
    });
    expect(answerByFieldId.get('field-multi-bad')).toMatchObject({
      answer_text: null,
      answer_number: null,
    });
    expect(answerByFieldId.get('field-boolean')).toMatchObject({
      answer_text: null,
      answer_number: null,
    });
    expect(answerByFieldId.get('field-email')).toMatchObject({
      answer_text: 'staff@example.com',
      answer_number: null,
    });
    expect(answerByFieldId.get('field-date')).toMatchObject({
      answer_text: '2026-09-15',
      answer_number: null,
    });
    expect(answerByFieldId.get('field-datetime')).toMatchObject({
      answer_text: '2026-09-15T08:30',
      answer_number: null,
    });

    expect(mockToast.success).toHaveBeenCalledWith('Attendance data saved for John Smith.');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits textarea, select, radio, and checkbox field types', async () => {
    const onClose = vi.fn();

    const registrantForFormTypes: RegistrantAttendanceRow = {
      attendee_kind: 'registered',
      registration_id: 'reg-3',
      public_registration_id: null,
      member_id: 'member-3',
      full_name: 'Sam Lee',
      email: 'sam@example.com',
      answers: [],
    };

    const formTypeFields: AttendanceField[] = [
      {
        id: 'field-textarea',
        event_id: 'event-1',
        field_key: 'notes',
        label: 'Notes',
        field_type: 'textarea',
        is_required: true,
        is_active: true,
        display_order: 0,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-select',
        event_id: 'event-1',
        field_key: 'team',
        label: 'Team',
        field_type: 'select',
        is_required: false,
        is_active: true,
        display_order: 1,
        options: [
          { label: 'Blue', value: 'blue' },
          { label: 'Gold', value: 'gold' },
        ],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-radio',
        event_id: 'event-1',
        field_key: 'entry_gate',
        label: 'Entry Gate',
        field_type: 'radio',
        is_required: false,
        is_active: true,
        display_order: 2,
        options: [
          { label: 'North', value: 'north' },
          { label: 'South', value: 'south' },
        ],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-checkbox',
        event_id: 'event-1',
        field_key: 'waiver_ack',
        label: 'Waiver Acknowledged',
        field_type: 'checkbox',
        is_required: false,
        is_active: true,
        display_order: 3,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={registrantForFormTypes}
        fields={formTypeFields}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: '  bring water  ' } });
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'gold' } });
    fireEvent.change(screen.getByLabelText('Entry Gate'), { target: { value: 'south' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Data' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockMutateAsync.mock.calls[0]?.[0];
    const answerByFieldId = new Map(
      payload.answers.map(
        (answer: {
          attendance_field_id: string;
          answer_text: string | null;
          answer_number: number | null;
        }) => [answer.attendance_field_id, answer],
      ),
    );

    expect(answerByFieldId.get('field-textarea')).toMatchObject({
      answer_text: 'bring water',
      answer_number: null,
    });
    expect(answerByFieldId.get('field-select')).toMatchObject({
      answer_text: 'gold',
      answer_number: null,
    });
    expect(answerByFieldId.get('field-radio')).toMatchObject({
      answer_text: 'south',
      answer_number: null,
    });
    expect(answerByFieldId.get('field-checkbox')).toMatchObject({
      answer_text: null,
      answer_number: null,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a fallback error message when mutation throws a non-Error value', async () => {
    mockMutateAsync.mockRejectedValueOnce('request-failed');
    const onClose = vi.fn();

    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={registrant}
        fields={fields}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Data' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to save attendance data. Please try again.',
      );
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows pending state while saving', () => {
    mockMutationState.isPending = true;

    render(
      <AttendanceDataEntryPanel
        eventId="event-1"
        registrant={registrant}
        fields={fields}
        onClose={() => {}}
        isOpen={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('falls back to empty defaults for invalid parsed arrays and null text answers', () => {
    const defaultRegistrant: RegistrantAttendanceRow = {
      attendee_kind: 'registered',
      registration_id: 'reg-4',
      public_registration_id: null,
      member_id: '',
      full_name: 'Default Case',
      email: null,
      answers: [
        {
          id: 'ans-invalid-array',
          registration_id: 'reg-4',
          public_registration_id: null,
          attendance_field_id: 'field-multi-invalid-shape',
          answer_text: '[1,2,3]',
          answer_number: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        {
          id: 'ans-null-text',
          registration_id: 'reg-4',
          public_registration_id: null,
          attendance_field_id: 'field-null-text',
          answer_text: null,
          answer_number: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    };

    const defaultFields: AttendanceField[] = [
      {
        id: 'field-multi-invalid-shape',
        event_id: 'event-1',
        field_key: 'groups',
        label: 'Groups',
        field_type: 'multi_select',
        is_required: false,
        is_active: true,
        display_order: 0,
        options: [
          { label: 'Group A', value: 'a' },
          { label: 'Group B', value: 'b' },
        ],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-null-text',
        event_id: 'event-1',
        field_key: 'comment',
        label: 'Comment',
        field_type: 'text',
        is_required: false,
        is_active: true,
        display_order: 1,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    render(
      <AttendanceDataEntryPanel
        eventId="event-1"
        registrant={defaultRegistrant}
        fields={defaultFields}
        onClose={() => {}}
        isOpen={true}
      />,
    );

    const groupAOption = screen.getByRole('option', { name: 'Group A' }) as HTMLOptionElement;
    const textInput = screen.getByLabelText('Comment') as HTMLInputElement;

    expect(groupAOption.selected).toBe(false);
    expect(textInput.value).toBe('');
  });

  it('handles missing option arrays and required indicators across field render branches', () => {
    const edgeCaseFields: AttendanceField[] = [
      {
        id: 'field-multi-no-options',
        event_id: 'event-1',
        field_key: 'multi_no_options',
        label: 'Multi Without Options',
        field_type: 'multi_select',
        is_required: false,
        is_active: true,
        display_order: 0,
        options: undefined as unknown as AttendanceField['options'],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-checkbox-required',
        event_id: 'event-1',
        field_key: 'checkbox_required',
        label: 'Required Checkbox',
        field_type: 'checkbox',
        is_required: true,
        is_active: true,
        display_order: 1,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'field-required-text',
        event_id: 'event-1',
        field_key: 'required_text',
        label: 'Required Text',
        field_type: 'text',
        is_required: true,
        is_active: true,
        display_order: 2,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    render(
      <AttendanceDataEntryPanel
        eventId="event-1"
        registrant={registrant}
        fields={edgeCaseFields}
        onClose={() => {}}
        isOpen={true}
      />,
    );

    const multiSelect = screen.getByLabelText('Multi Without Options') as HTMLSelectElement;
    expect(multiSelect.options).toHaveLength(0);
    expect(screen.getByLabelText(/Required Checkbox/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Required Text/)).toBeInTheDocument();
  });

  it('shows an empty-state message when no attendance fields are configured', () => {
    render(
      <AttendanceDataEntryPanel
        eventId="event-1"
        registrant={registrant}
        fields={[]}
        onClose={() => {}}
        isOpen={true}
      />,
    );

    expect(screen.getByText('No attendance fields configured for this event.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Data' })).toBeDisabled();
  });
});
