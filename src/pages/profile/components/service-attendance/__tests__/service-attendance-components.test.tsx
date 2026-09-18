import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  MatrixCellData,
  ServiceAttendance,
  ServiceAttendanceSeat,
} from '@/lib/domain/services';

import {
  NonSundayAttendanceList,
  ServiceAttendanceHeaderControls,
  ServiceAttendanceLegend,
  ServiceAttendanceMonthSummary,
  ServiceAttendanceStatusBadge,
  ServiceMatrixCell,
  formatAssignedSeat,
} from '../index';

function createMockSeat(overrides?: Partial<ServiceAttendanceSeat>): ServiceAttendanceSeat {
  return {
    id: 's-1',
    table_number: 'Table 1',
    seat_number: '1',
    area: 'Main Hall',
    ...overrides,
  };
}

function createMockAttendance(overrides?: Partial<ServiceAttendance>): ServiceAttendance {
  return {
    id: 'att-1',
    user_id: 'user-1',
    rfid: 'rfid-1',
    service_date: '2026-06-07',
    time_slot: '9AM',
    checked_in_at: '2026-06-07T09:05:00Z',
    is_walk_in: false,
    is_override: false,
    is_manual_entry: false,
    service_seat_id: null,
    service_seats: null,
    metadata: {},
    created_at: '2026-06-07T09:05:00Z',
    updated_at: '2026-06-07T09:05:00Z',
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

describe('ServiceAttendanceStatusBadge', () => {
  it('renders Regular badge for standard check-ins', () => {
    render(<ServiceAttendanceStatusBadge record={createMockAttendance()} />);
    expect(screen.getByText('Regular')).toBeInTheDocument();
  });

  it('renders Walk-in badge when is_walk_in is true', () => {
    render(<ServiceAttendanceStatusBadge record={createMockAttendance({ is_walk_in: true })} />);
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
  });

  it('renders Override badge when is_override is true', () => {
    render(<ServiceAttendanceStatusBadge record={createMockAttendance({ is_override: true })} />);
    expect(screen.getByText('Override')).toBeInTheDocument();
  });

  it('renders Manual badge when is_manual_entry is true', () => {
    render(
      <ServiceAttendanceStatusBadge record={createMockAttendance({ is_manual_entry: true })} />,
    );
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});

describe('formatAssignedSeat & ServiceMatrixCell', () => {
  it('formats assigned seats correctly', () => {
    expect(formatAssignedSeat(null)).toBe('Unassigned');
    expect(formatAssignedSeat(undefined)).toBe('Unassigned');
    expect(formatAssignedSeat(createMockSeat({ table_number: 'unassigned' }))).toBe('Unassigned');
    expect(
      formatAssignedSeat(
        createMockSeat({ table_number: 'Table 4', seat_number: null, area: null }),
      ),
    ).toBe('Table 4');
    expect(
      formatAssignedSeat(
        createMockSeat({
          table_number: 'Table 4',
          seat_number: '2',
          area: 'Main Hall',
        }),
      ),
    ).toBe('Table 4, Seat 2, (Main Hall)');
  });

  it('renders attended_committed cell', () => {
    const cell: MatrixCellData = {
      status: 'attended_committed',
      attendance: createMockAttendance({
        service_seats: createMockSeat({ table_number: 'Table 1', seat_number: '3', area: null }),
      }),
      isCommitted: true,
      sundayKey: 'first_sunday',
      timeSlot: '9AM',
    };

    render(<ServiceMatrixCell cell={cell} />);
    expect(screen.getByText('Committed')).toBeInTheDocument();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('Table 1, Seat 3')).toBeInTheDocument();
  });

  it('renders attended_unscheduled cell', () => {
    const cell: MatrixCellData = {
      status: 'attended_unscheduled',
      attendance: createMockAttendance({
        time_slot: '12NN',
        is_walk_in: true,
      }),
      isCommitted: false,
      sundayKey: 'first_sunday',
      timeSlot: '12NN',
    };

    render(<ServiceMatrixCell cell={cell} />);
    expect(screen.getByText('Unscheduled')).toBeInTheDocument();
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
  });

  it('renders missed_committed, upcoming_committed, not_applicable, and off_schedule cells', () => {
    const missedCell: MatrixCellData = {
      status: 'missed_committed',
      isCommitted: true,
      sundayKey: 'second_sunday',
      timeSlot: '9AM',
    };
    const { rerender } = render(<ServiceMatrixCell cell={missedCell} />);
    expect(screen.getByText('Missed Committed')).toBeInTheDocument();

    const upcomingCell: MatrixCellData = {
      status: 'upcoming_committed',
      isCommitted: true,
      sundayKey: 'third_sunday',
      timeSlot: '9AM',
    };
    rerender(<ServiceMatrixCell cell={upcomingCell} />);
    expect(screen.getByText('Upcoming Committed')).toBeInTheDocument();

    const naCell: MatrixCellData = {
      status: 'not_applicable',
      isCommitted: false,
      sundayKey: 'fifth_sunday',
      timeSlot: '9AM',
    };
    rerender(<ServiceMatrixCell cell={naCell} />);
    expect(screen.getByText('—')).toBeInTheDocument();

    const offScheduleCell: MatrixCellData = {
      status: 'off_schedule',
      isCommitted: false,
      sundayKey: 'first_sunday',
      timeSlot: '3PM',
    };
    rerender(<ServiceMatrixCell cell={offScheduleCell} />);
    expect(screen.getByText('Off Schedule')).toBeInTheDocument();
  });
});

describe('ServiceAttendanceHeaderControls', () => {
  it('handles navigation and selection callbacks', () => {
    const onToday = vi.fn();
    const onSelectYear = vi.fn();
    const onPreviousMonth = vi.fn();
    const onNextMonth = vi.fn();

    render(
      <ServiceAttendanceHeaderControls
        viewYear={2026}
        viewMonthIndex={5}
        monthOnlyName="June"
        isAtToday={false}
        years={[2025, 2026, 2027]}
        onToday={onToday}
        onSelectYear={onSelectYear}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
      />,
    );

    expect(screen.getByText('June')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onPreviousMonth).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });
});

describe('ServiceAttendanceMonthSummary & ServiceAttendanceLegend', () => {
  it('renders month summary with singular and plural counts and missed commitments', () => {
    const { rerender } = render(
      <ServiceAttendanceMonthSummary
        attendanceCount={1}
        fullMonthName="June 2026"
        missedCount={0}
        isFetching={true}
      />,
    );

    expect(screen.getByText('1 service attended in June 2026')).toBeInTheDocument();
    expect(screen.getByText('(updating...)')).toBeInTheDocument();
    expect(screen.getByText('1 Total')).toBeInTheDocument();
    expect(screen.queryByText(/Missed/)).not.toBeInTheDocument();

    rerender(
      <ServiceAttendanceMonthSummary
        attendanceCount={3}
        fullMonthName="June 2026"
        missedCount={2}
        isFetching={false}
      />,
    );

    expect(screen.getByText('3 services attended in June 2026')).toBeInTheDocument();
    expect(screen.getByText('3 Total')).toBeInTheDocument();
    expect(screen.getByText('2 Missed')).toBeInTheDocument();
  });

  it('renders schedule alignment legend', () => {
    render(<ServiceAttendanceLegend />);
    expect(screen.getByText('Schedule Alignment:')).toBeInTheDocument();
    expect(screen.getByText('Attended (Committed)')).toBeInTheDocument();
    expect(screen.getByText('Attended (Unscheduled)')).toBeInTheDocument();
    expect(screen.getByText('Missed Committed')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Committed')).toBeInTheDocument();
  });
});

describe('NonSundayAttendanceList', () => {
  it('returns null when empty', () => {
    const { container } = render(<NonSundayAttendanceList records={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders non-Sunday records', () => {
    const record = createMockAttendance({
      id: 'att-ns-1',
      service_date: '2026-06-03', // Wednesday
      time_slot: '7PM',
      checked_in_at: '2026-06-03T19:00:00Z',
    });

    render(<NonSundayAttendanceList records={[record]} />);
    expect(screen.getByText('Other Services Attended')).toBeInTheDocument();
    expect(screen.getByText(/2026-06-03 • 7PM/)).toBeInTheDocument();
  });
});
