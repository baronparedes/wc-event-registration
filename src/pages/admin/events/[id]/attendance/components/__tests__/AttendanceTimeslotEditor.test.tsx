import type { ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import type { FieldErrors } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { AttendanceTimeslotConfig } from '@/lib/domain/attendance';
import { AttendanceTimeslotEditor } from '@/pages/admin/events/[id]/attendance/components/AttendanceTimeslotEditor';

type TimeslotFormShape = { timeslots: AttendanceTimeslotConfig[] };

function renderEditor(overrides?: Partial<ComponentProps<typeof AttendanceTimeslotEditor>>) {
  const onAddTimeslot = vi.fn();
  const onRemoveTimeslot = vi.fn();
  const onUpdateTimeslotField = vi.fn();

  const props: ComponentProps<typeof AttendanceTimeslotEditor> = {
    eventStartsAt: '2026-07-10T08:00:00+08:00',
    eventEndsAt: '2026-07-10T12:00:00+08:00',
    eventStartLocal: '2026-07-10T08:00',
    eventEndLocal: '2026-07-10T12:00',
    errors: {} as FieldErrors<TimeslotFormShape>,
    isArchived: false,
    timeslots: [
      {
        slot_at: '2026-07-10T10:30+08:00',
        opens_at: '2026-07-10T10:00+08:00',
        closes_at: '2026-07-10T11:00+08:00',
      },
    ],
    onAddTimeslot,
    onRemoveTimeslot,
    onUpdateTimeslotField,
    ...overrides,
  };

  render(<AttendanceTimeslotEditor {...props} />);

  return {
    onAddTimeslot,
    onRemoveTimeslot,
    onUpdateTimeslotField,
  };
}

describe('AttendanceTimeslotEditor', () => {
  it('renders slot, opens_at, and closes_at inputs for each row', () => {
    renderEditor();

    expect(screen.getByLabelText('Slot time')).toHaveValue('2026-07-10T10:30');
    expect(screen.getByLabelText('Opens at')).toHaveValue('2026-07-10T10:00');
    expect(screen.getByLabelText('Closes at')).toHaveValue('2026-07-10T11:00');
  });

  it('calls onUpdateTimeslotField for opens_at, slot_at, and closes_at changes', () => {
    const { onUpdateTimeslotField } = renderEditor();

    fireEvent.change(screen.getByLabelText('Opens at'), {
      target: { value: '2026-07-10T09:45' },
    });
    fireEvent.change(screen.getByLabelText('Slot time'), {
      target: { value: '2026-07-10T10:15' },
    });
    fireEvent.change(screen.getByLabelText('Closes at'), {
      target: { value: '2026-07-10T10:45' },
    });

    expect(onUpdateTimeslotField).toHaveBeenNthCalledWith(1, 0, 'opens_at', '2026-07-10T09:45');
    expect(onUpdateTimeslotField).toHaveBeenNthCalledWith(2, 0, 'slot_at', '2026-07-10T10:15');
    expect(onUpdateTimeslotField).toHaveBeenNthCalledWith(3, 0, 'closes_at', '2026-07-10T10:45');
  });

  it('calls add and remove handlers for timeslot row actions', () => {
    const { onAddTimeslot, onRemoveTimeslot } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onAddTimeslot).toHaveBeenCalledTimes(1);
    expect(onRemoveTimeslot).toHaveBeenCalledWith(0);
  });
});
