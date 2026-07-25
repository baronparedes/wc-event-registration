import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttendeeConfirmStep } from '@/pages/admin/events/[id]/attendance/check-in/components/AttendeeConfirmStep';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
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
});
