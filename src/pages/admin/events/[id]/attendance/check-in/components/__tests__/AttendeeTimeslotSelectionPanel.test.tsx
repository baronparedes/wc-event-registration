import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttendeeTimeslotSelectionPanel } from '@/pages/admin/events/[id]/attendance/check-in/components/AttendeeTimeslotSelectionPanel';

describe('AttendeeTimeslotSelectionPanel', () => {
  it('hides slots whose opens_at window is still in the future', () => {
    render(
      <AttendeeTimeslotSelectionPanel
        autoWindowModeEnabled={false}
        activeSlot={null}
        currentTimeMs={Date.parse('2026-07-10T09:00:00+08:00')}
        isSubmitting={false}
        suggestedSlot=""
        timeslots={[
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
        ]}
        onTimeslotConfirm={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('keeps legacy slots visible when opens_at is missing', () => {
    render(
      <AttendeeTimeslotSelectionPanel
        autoWindowModeEnabled={false}
        activeSlot={null}
        currentTimeMs={Date.parse('2026-07-10T09:00:00+08:00')}
        isSubmitting={false}
        suggestedSlot=""
        timeslots={[
          {
            slot_at: '2026-07-10T11:00:00+08:00',
            opens_at: null,
            closes_at: null,
          },
        ]}
        onTimeslotConfirm={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Check in without timeslot' })).toBeInTheDocument();
  });

  it('renders no buttons when all slots are not yet open', () => {
    render(
      <AttendeeTimeslotSelectionPanel
        autoWindowModeEnabled={false}
        activeSlot={null}
        currentTimeMs={Date.parse('2026-07-10T09:00:00+08:00')}
        isSubmitting={false}
        suggestedSlot=""
        timeslots={[
          {
            slot_at: '2026-07-10T11:00:00+08:00',
            opens_at: '2026-07-10T10:30:00+08:00',
            closes_at: '2026-07-10T11:30:00+08:00',
          },
        ]}
        onTimeslotConfirm={vi.fn()}
      />,
    );

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('allows unrestricted slots when auto-window mode has no active slot', () => {
    render(
      <AttendeeTimeslotSelectionPanel
        autoWindowModeEnabled={true}
        activeSlot={null}
        currentTimeMs={Date.parse('2026-07-10T09:00:00+08:00')}
        isSubmitting={false}
        suggestedSlot=""
        timeslots={[
          {
            slot_at: '2026-07-10T09:00:00+08:00',
            opens_at: null,
            closes_at: null,
          },
        ]}
        onTimeslotConfirm={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).not.toBeDisabled();
  });
});
