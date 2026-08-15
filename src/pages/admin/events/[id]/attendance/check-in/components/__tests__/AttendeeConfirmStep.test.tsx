import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttendeeConfirmStep } from '@/pages/admin/events/[id]/attendance/check-in/components/AttendeeConfirmStep';

const { mockGetAnswerText, mockFormatDateTime, mockAvatar } = vi.hoisted(() => ({
  mockGetAnswerText: vi.fn(
    (fieldType: string, answer: { answer_text?: string | null; answer_number?: number | null }) =>
      fieldType === 'color_picker'
        ? (answer.answer_text ?? '—')
        : `formatted:${answer.answer_text ?? answer.answer_number ?? ''}`,
  ),
  mockFormatDateTime: vi.fn((value: string, fallback?: string) =>
    fallback ? fallback : `formatted-date:${value}`,
  ),
  mockAvatar: vi.fn(({ name }: { name: string }) => <div>{name}</div>),
}));

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils');

  return {
    ...actual,
    useFieldAnswerTextFormatter: () => ({
      getAnswerText: mockGetAnswerText,
    }),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    formatDateTime: mockFormatDateTime,
  };
});

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: (props: { name: string; avatarObjectKey?: string | null; size?: string }) => {
    mockAvatar(props);
    return <div>{props.name}</div>;
  },
}));

const attendee = {
  attendee_kind: 'registered' as const,
  registration_id: 'registration-1',
  public_registration_id: null,
  user_id: 'user-1',
  member_id: 'M-001',
  nickname: 'Alex',
  last_name: 'Rivera',
  full_name: 'Alex Rivera',
  email: 'alex@example.com',
  role: 'Member',
  category: 'Adults',
  registration_status: 'submitted' as const,
  submitted_at: '2026-07-10T08:00:00+08:00',
  check_in_status: 'not_checked_in' as const,
  official_check_in_time: null,
  registration_answers: [],
  attendance_answers: [],
};

const timeslots = [
  {
    slot_at: '2026-07-10T09:00:00+08:00',
    opens_at: '2026-07-10T08:30:00+08:00',
    closes_at: '2026-07-10T09:30:00+08:00',
  },
  {
    slot_at: '2026-07-10T11:00:00+08:00',
    opens_at: '2026-07-10T10:30:00+08:00',
    closes_at: '2026-07-10T11:30:00+08:00',
  },
];

describe('AttendeeConfirmStep', () => {
  it('shows the empty-state prompt when no attendee is selected', () => {
    render(
      <AttendeeConfirmStep
        attendee={null}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Select an attendee from search results to continue.'),
    ).toBeInTheDocument();
  });

  it('shows the confirm action and submitting state for non-timeslot check-in', () => {
    const onCheckIn = vi.fn();

    render(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={true}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={onCheckIn}
        onReadyForNext={vi.fn()}
      />,
    );

    const confirmButtons = screen.getAllByRole('button', { name: 'Checking In...' });
    expect(confirmButtons).toHaveLength(2);
    confirmButtons.forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });
    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it('shows ready-for-next action for already checked-in attendees in non-timeslot flow', () => {
    const onReadyForNext = vi.fn();

    render(
      <AttendeeConfirmStep
        attendee={{
          ...attendee,
          check_in_status: 'checked_in',
          official_check_in_time: '2026-07-10T09:05:00+08:00',
        }}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={onReadyForNext}
      />,
    );

    expect(screen.getByText('Already Checked In')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm Check-In' })).not.toBeInTheDocument();

    const readyButton = screen.getAllByRole('button', { name: 'Ready for Next Attendee' })[0];
    fireEvent.click(readyButton);
    expect(onReadyForNext).toHaveBeenCalledTimes(1);
  });

  it('renders avatar, formatted dates, and answer cards for registration and attendance answers', () => {
    render(
      <AttendeeConfirmStep
        attendee={{
          ...attendee,
          avatar_object_key: 'avatars/alex.jpg',
          registration_answers: [
            {
              event_field_id: 'field-1',
              label: 'Team Color',
              field_key: 'team_color',
              field_type: 'color_picker',
              answer_text: '#22c55e',
              answer_number: null,
            },
            {
              event_field_id: 'field-2',
              label: 'Notes',
              field_key: 'notes',
              field_type: 'text',
              answer_text: 'Bring badge',
              answer_number: null,
            },
            {
              event_field_id: 'field-3',
              label: 'Group',
              field_key: 'group',
              field_type: 'text',
              answer_text: 'North',
              answer_number: null,
            },
          ],
          attendance_answers: [
            {
              attendance_field_id: 'attendance-1',
              label: 'Lane',
              field_key: 'lane',
              field_type: 'text',
              answer_text: 'A1',
              answer_number: null,
            },
            {
              attendance_field_id: 'attendance-2',
              label: 'Vest Color',
              field_key: 'vest_color',
              field_type: 'color_picker',
              answer_text: '#0f172a',
              answer_number: null,
            },
          ],
        }}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex Rivera',
        avatarObjectKey: 'avatars/alex.jpg',
      }),
    );
    expect(screen.getByText('formatted-date:2026-07-10T08:00:00+08:00')).toBeInTheDocument();
    expect(screen.getByText('Registration answers')).toBeInTheDocument();
    expect(screen.getByText('Attendance details')).toBeInTheDocument();
    expect(screen.getByTitle('#22c55e')).toBeInTheDocument();
    expect(screen.getByTitle('#0f172a')).toBeInTheDocument();
    expect(screen.getByText('formatted:Bring badge')).toBeInTheDocument();
    expect(screen.getByText('formatted:North')).toBeInTheDocument();
    expect(screen.getByText('formatted:A1')).toBeInTheDocument();
  });

  it('renders a full-width answer card when only one answer exists', () => {
    render(
      <AttendeeConfirmStep
        attendee={{
          ...attendee,
          registration_answers: [
            {
              event_field_id: 'field-1',
              label: 'Notes',
              field_key: 'notes',
              field_type: 'text',
              answer_text: 'Only one',
              answer_number: null,
            },
          ],
          attendance_answers: [],
        }}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Notes').closest('li')).toHaveClass('w-full');
  });

  it('renders check-in result banners for success, already-checked-in, and failure states', () => {
    const { rerender } = render(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={{
          success: true,
          status: 'checked_in',
          attendee_kind: 'registered',
          message: 'Checked in successfully.',
          official_check_in_time: '2026-07-10T11:02:00+08:00',
        }}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Checked in successfully.')).toBeInTheDocument();
    expect(
      screen.getByText('Official time: formatted-date:2026-07-10T11:02:00+08:00'),
    ).toBeInTheDocument();

    rerender(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={{
          success: true,
          status: 'already_checked_in',
          attendee_kind: 'registered',
          message: 'Already checked in.',
          official_check_in_time: null,
        }}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Already checked in.')).toBeInTheDocument();

    rerender(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={{
          success: false,
          status: 'rejected',
          attendee_kind: 'registered',
          message: 'Check-in failed.',
          official_check_in_time: null,
        }}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={false}
        timeslots={[]}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Check-in failed.')).toBeInTheDocument();
  });

  it('hides the generic confirm button in auto-window mode', () => {
    render(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={true}
        timeslots={timeslots}
        autoWindowModeEnabled={true}
        activeSlot="2026-07-10T11:00:00+08:00"
        suggestedSlot="2026-07-10T11:00:00+08:00"
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Confirm Check-In' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renders no timeslot actions when no active window exists', () => {
    render(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={true}
        timeslots={timeslots}
        autoWindowModeEnabled={true}
        activeSlot={null}
        suggestedSlot=""
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('only allows the active slot button in auto-window mode', () => {
    const onTimeslotConfirm = vi.fn();

    render(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={true}
        timeslots={timeslots}
        autoWindowModeEnabled={true}
        activeSlot="2026-07-10T11:00:00+08:00"
        suggestedSlot="2026-07-10T11:00:00+08:00"
        onTimeslotConfirm={onTimeslotConfirm}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    const buttons = screen
      .getAllByRole('button')
      .filter((button) =>
        button.textContent?.includes('2026') || button.textContent?.includes('2027')
          ? true
          : button.textContent?.includes('AM') || button.textContent?.includes('PM'),
      );

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).not.toBeDisabled();

    fireEvent.click(buttons[0]);
    expect(onTimeslotConfirm).toHaveBeenCalledWith('2026-07-10T11:00:00+08:00');
  });

  it('keeps the manual timeslot flow available when auto-window mode is off', () => {
    render(
      <AttendeeConfirmStep
        attendee={attendee}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={true}
        timeslots={timeslots}
        autoWindowModeEnabled={false}
        activeSlot={null}
        suggestedSlot="2026-07-10T09:00:00+08:00"
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('shows ready-for-next in timeslot mode when attendee is already checked in for the active slot', () => {
    const onReadyForNext = vi.fn();

    render(
      <AttendeeConfirmStep
        attendee={{
          ...attendee,
          check_in_status: 'checked_in',
          official_check_in_time: '2026-07-10T09:05:00+08:00',
          slot_records: [
            {
              slot: '2026-07-10T11:00:00+08:00',
              recorded_at: '2026-07-10T11:03:00+08:00',
            },
          ],
        }}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={true}
        timeslots={timeslots}
        autoWindowModeEnabled={true}
        activeSlot="2026-07-10T11:00:00+08:00"
        suggestedSlot="2026-07-10T11:00:00+08:00"
        onTimeslotConfirm={vi.fn()}
        onCheckIn={vi.fn()}
        onReadyForNext={onReadyForNext}
      />,
    );

    expect(screen.getByText('Already checked in for this timeslot.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm Check-In' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ready for Next Attendee' }));
    expect(onReadyForNext).toHaveBeenCalledTimes(1);
  });

  it('keeps active timeslot check-in available when attendee checked into a different slot', () => {
    const onTimeslotConfirm = vi.fn();

    render(
      <AttendeeConfirmStep
        attendee={{
          ...attendee,
          check_in_status: 'checked_in',
          official_check_in_time: '2026-07-10T09:05:00+08:00',
          slot_records: [
            {
              slot: '2026-07-10T09:00:00+08:00',
              recorded_at: '2026-07-10T09:01:00+08:00',
            },
          ],
        }}
        checkInResult={null}
        currentTimeMs={Date.parse('2026-07-10T11:00:00+08:00')}
        isSubmitting={false}
        timeslotEnabled={true}
        timeslots={timeslots}
        autoWindowModeEnabled={true}
        activeSlot="2026-07-10T11:00:00+08:00"
        suggestedSlot="2026-07-10T11:00:00+08:00"
        onTimeslotConfirm={onTimeslotConfirm}
        onCheckIn={vi.fn()}
        onReadyForNext={vi.fn()}
      />,
    );

    const activeSlotButton = screen.getByRole('button', {
      name: /Select timeslot/i,
    });
    fireEvent.click(activeSlotButton);

    expect(onTimeslotConfirm).toHaveBeenCalledWith('2026-07-10T11:00:00+08:00');
  });
});
