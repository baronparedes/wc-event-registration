import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RegistrantAttendanceRow } from '@/lib';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

import { AttendanceDataEntryPanel } from '../AttendanceDataEntryPanel';

const mockUpsertMutation = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/hooks/domain/attendance', () => ({
  useUpsertAttendanceAnswersMutation: () => ({
    mutateAsync: mockUpsertMutation,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Conditional Visibility in Attendance Data Entry', () => {
  const fields: AttendanceField[] = [
    {
      id: 'att-field-1',
      event_id: 'event-1',
      field_key: 'seating_area',
      label: 'Seating Area',
      field_type: 'select',
      is_required: false,
      is_active: true,
      options: [
        { label: 'General', value: 'General' },
        { label: 'VIP Area', value: 'VIP Area' },
      ],
      display_order: 1,
      validation_rules: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'att-field-2',
      event_id: 'event-1',
      field_key: 'vip_table_number',
      label: 'VIP Table Number',
      field_type: 'text',
      is_required: true,
      is_active: true,
      options: [],
      display_order: 2,
      validation_rules: {
        visibility_rule: {
          depends_on_field_key: 'seating_area',
          equals_value: 'VIP Area',
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const registrant: RegistrantAttendanceRow = {
    registration_id: 'reg-1',
    public_registration_id: null,
    full_name: 'John Smith',
    nickname: 'John',
    last_name: 'Smith',
    attendee_kind: 'registered',
    member_id: 'MEM-002',
    email: 'john@example.com',
    answers: [],
  };

  it('hides dependent attendance field when parent value is not selected or does not match', () => {
    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={registrant}
        fields={fields}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Seating Area')).toBeInTheDocument();
    expect(screen.queryByLabelText(/VIP Table Number/i)).not.toBeInTheDocument();
  });

  it('shows dependent field when parent value matches target value', () => {
    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={registrant}
        fields={fields}
        onClose={() => {}}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Seating Area/i });
    fireEvent.click(trigger);

    const vipOption = screen.getByRole('option', { name: /VIP Area/i });
    fireEvent.click(vipOption);

    expect(screen.getByLabelText(/VIP Table Number/i)).toBeInTheDocument();
  });

  it('clears answer for hidden attendance field upon submission', async () => {
    render(
      <AttendanceDataEntryPanel
        isOpen={true}
        eventId="event-1"
        registrant={{
          ...registrant,
          answers: [
            {
              id: 'ans-1',
              registration_id: 'reg-1',
              public_registration_id: null,
              attendance_field_id: 'att-field-1',
              answer_text: 'General',
              answer_number: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'ans-2',
              registration_id: 'reg-1',
              public_registration_id: null,
              attendance_field_id: 'att-field-2',
              answer_text: 'Table 5',
              answer_number: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        }}
        fields={fields}
        onClose={() => {}}
      />,
    );

    // Seating Area is 'General', so VIP Table Number is hidden.
    const saveBtn = screen.getByRole('button', { name: /Save Data/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpsertMutation).toHaveBeenCalled();
    });

    const submittedAnswers = mockUpsertMutation.mock.calls[0][0].answers;
    const vipAnswer = submittedAnswers.find(
      (a: { attendance_field_id: string }) => a.attendance_field_id === 'att-field-2',
    );

    // VIP Table Number answer should be set to null since it's hidden
    expect(vipAnswer).toEqual({
      attendance_field_id: 'att-field-2',
      answer_text: null,
      answer_number: null,
    });
  });
});
