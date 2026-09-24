import { fireEvent, render, screen } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServiceAttendance } from '@/lib/domain/services';

import { ExportServiceAttendanceButton } from '../ExportServiceAttendanceButton';

const mockAttendanceRecords: ServiceAttendance[] = [
  {
    id: 'rec-1',
    user_id: 'user-1',
    rfid: 'RFID001',
    service_date: '2026-03-15',
    time_slot: '9AM',
    checked_in_at: '2026-03-15T09:05:00Z',
    is_walk_in: false,
    is_override: false,
    is_manual_entry: false,
    service_seat_id: 'seat-1',
    metadata: { role: 'Usher' },
    created_at: '2026-03-15T09:05:00Z',
    updated_at: '2026-03-15T09:05:00Z',
    created_by: null,
    updated_by: null,
    service_seats: { id: 'seat-1', table_number: '12', seat_number: '1', area: 'Main' },
    user: {
      member_id: 'RFID001',
      full_name: 'Jane Doe',
      nickname: 'Jane',
      avatar_object_key: 'avatars/jane.jpg',
    },
  },
];

describe('ExportServiceAttendanceButton', () => {
  let createObjectURLSpy: Mock;
  let revokeObjectURLSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;
  });

  it('renders Export as CSV button', () => {
    render(
      <ExportServiceAttendanceButton
        records={mockAttendanceRecords}
        startDate="2026-03-15"
        endDate="2026-03-15"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Export service attendance as CSV' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
  });

  it('is disabled when records array is empty', () => {
    render(
      <ExportServiceAttendanceButton records={[]} startDate="2026-03-15" endDate="2026-03-15" />,
    );

    const button = screen.getByRole('button', { name: 'Export service attendance as CSV' });
    expect(button).toBeDisabled();
  });

  it('triggers client-side CSV download on click', () => {
    render(
      <ExportServiceAttendanceButton
        records={mockAttendanceRecords}
        startDate="2026-03-15"
        endDate="2026-03-15"
      />,
    );

    const button = screen.getByRole('button', { name: 'Export service attendance as CSV' });
    fireEvent.click(button);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('respects disabled prop', () => {
    render(
      <ExportServiceAttendanceButton
        records={mockAttendanceRecords}
        startDate="2026-03-15"
        endDate="2026-03-15"
        disabled={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Export service attendance as CSV' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });
});
