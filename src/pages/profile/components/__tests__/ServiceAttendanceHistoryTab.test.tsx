import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServiceAttendance } from '@/lib/domain/services';

import { ServiceAttendanceHistoryTab } from '../ServiceAttendanceHistoryTab';

const { mockUseServiceAttendanceQuery, mockUseUserCommitmentHistoryQuery } = vi.hoisted(() => ({
  mockUseServiceAttendanceQuery: vi.fn(),
  mockUseUserCommitmentHistoryQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/services', () => ({
  useServiceAttendanceQuery: (...args: unknown[]) => mockUseServiceAttendanceQuery(...args),
  useUserCommitmentHistoryQuery: (...args: unknown[]) => mockUseUserCommitmentHistoryQuery(...args),
  useUserCommitmentHistoryQuery: (...args: unknown[]) => mockUseUserCommitmentHistoryQuery(...args),
}));

const sampleAttendance: ServiceAttendance[] = [
  {
    id: 'att-1',
    user_id: 'user-1',
    rfid: 'rfid-1',
    service_date: '2026-09-06',
    time_slot: '9AM',
    checked_in_at: '2026-09-06T08:50:00Z',
    is_walk_in: false,
    is_override: false,
    is_manual_entry: false,
    service_seat_id: 'seat-1',
    service_seats: {
      id: 'seat-1',
      table_number: '14',
      seat_number: '2',
      area: null,
    },
    metadata: {},
    created_at: '2026-09-06T08:50:00Z',
    updated_at: '2026-09-06T08:50:00Z',
    created_by: null,
    updated_by: null,
  },
  {
    id: 'att-2',
    user_id: 'user-1',
    rfid: 'rfid-1',
    service_date: '2026-09-13',
    time_slot: '12NN',
    checked_in_at: '2026-09-13T11:55:00Z',
    is_walk_in: true,
    is_override: false,
    is_manual_entry: false,
    service_seat_id: 'seat-2',
    service_seats: {
      id: 'seat-2',
      table_number: 'Usher / Backroom',
      seat_number: null,
      area: null,
    },
    metadata: {},
    created_at: '2026-09-13T11:55:00Z',
    updated_at: '2026-09-13T11:55:00Z',
    created_by: null,
    updated_by: null,
  },
  {
    id: 'att-3',
    user_id: 'user-1',
    rfid: 'rfid-1',
    service_date: '2026-09-20',
    time_slot: '3PM',
    checked_in_at: '2026-09-20T14:50:00Z',
    is_walk_in: false,
    is_override: true,
    is_manual_entry: false,
    service_seat_id: null,
    service_seats: null,
    metadata: {},
    created_at: '2026-09-20T14:50:00Z',
    updated_at: '2026-09-20T14:50:00Z',
    created_by: null,
    updated_by: null,
  },
  {
    id: 'att-4',
    user_id: 'user-1',
    rfid: 'rfid-1',
    service_date: '2026-09-27',
    time_slot: '9AM',
    checked_in_at: '2026-09-27T08:45:00Z',
    is_walk_in: false,
    is_override: false,
    is_manual_entry: true,
    service_seat_id: null,
    service_seats: null,
    metadata: {},
    created_at: '2026-09-27T08:45:00Z',
    updated_at: '2026-09-27T08:45:00Z',
    created_by: null,
    updated_by: null,
  },
];

describe('ServiceAttendanceHistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServiceAttendanceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
    } as any);
  });

  it('renders section card header and navigation controls', () => {
    render(<ServiceAttendanceHistoryTab memberId="user-1" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Service Attendance History' }),
    ).toBeInTheDocument();
    expect(screen.getByText('View your service attendance by month.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseServiceAttendanceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    render(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('Loading attendance history...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseServiceAttendanceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    render(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('Failed to load attendance history.')).toBeInTheDocument();
  });

  it('renders matrix table consistently even when no attendance records exist', () => {
    mockUseServiceAttendanceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    render(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('0 Total')).toBeInTheDocument();
    expect(screen.getByText('Schedule Alignment:')).toBeInTheDocument();
    expect(screen.getAllByText('1st Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9AM').length).toBeGreaterThan(0);
  });

  it('renders monthly attendance matrix with records, Sundays, and status badges', () => {
    render(<ServiceAttendanceHistoryTab memberId="user-1" />);

    expect(screen.getByText('4 Total')).toBeInTheDocument();

    expect(screen.getAllByText('2026-09-06').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-09-13').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-09-20').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-09-27').length).toBeGreaterThan(0);

    expect(screen.getAllByText('1st Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2nd Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3rd Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4th Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5th Sunday').length).toBeGreaterThan(0);

    expect(screen.getAllByText('9AM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12NN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3PM').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Regular').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Walk-in').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Override').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Assignment:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('14, Seat 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Usher / Backroom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
  });

  it('displays committed vs unscheduled alignment badges and missed commitments', () => {
    const metadata = {
      first_sunday: '9AM',
      second_sunday: '9AM, 12NN',
      third_sunday: '9AM',
      fourth_sunday: '9AM',
      fifth_sunday: '',
    };

    render(<ServiceAttendanceHistoryTab memberId="user-1" metadata={metadata} />);

    expect(screen.getAllByText('Committed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unscheduled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Missed Committed').length).toBeGreaterThan(0);
  });

  it('renders other services attended for attendances on non-Sundays', () => {
    const nonSundayData: ServiceAttendance[] = [
      ...sampleAttendance,
      {
        id: 'att-special',
        user_id: 'user-1',
        rfid: 'rfid-1',
        service_date: '2026-09-18',
        time_slot: '7PM',
        checked_in_at: '2026-09-18T18:50:00Z',
        is_walk_in: false,
        is_override: false,
        is_manual_entry: false,
        service_seat_id: null,
        service_seats: null,
        metadata: {},
        created_at: '2026-09-18T18:50:00Z',
        updated_at: '2026-09-18T18:50:00Z',
        created_by: null,
        updated_by: null,
      },
    ];

    mockUseServiceAttendanceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    render(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('Other Services Attended')).toBeInTheDocument();
    expect(screen.getByText('2026-09-18 • 7PM')).toBeInTheDocument();
  });

  it('navigates to next and previous months and today', () => {
    render(<ServiceAttendanceHistoryTab memberId="user-1" />);

    const nextBtn = screen.getByRole('button', { name: 'Next month' });
    fireEvent.click(nextBtn);

    expect(mockUseServiceAttendanceQuery).toHaveBeenCalled();

    const prevBtn = screen.getByRole('button', { name: 'Previous month' });
    fireEvent.click(prevBtn);

    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);
  });

  it('allows explicitly selecting a year and respects month bounds', () => {
    render(<ServiceAttendanceHistoryTab memberId="user-1" />);

    const yearSelect = screen.getByRole('button', { name: 'Select year' });
    expect(yearSelect).toBeInTheDocument();

    fireEvent.click(yearSelect);
    const option2025 = screen.getByRole('option', { name: '2025' });
    fireEvent.click(option2025);
    expect(screen.getByRole('button', { name: 'Select year' })).toHaveTextContent('2025');

    // Clicking previous month until January disables previous month
    const prevBtn = screen.getByRole('button', { name: 'Previous month' });
    for (let i = 0; i < 12; i++) {
      if (!prevBtn.hasAttribute('disabled')) {
        fireEvent.click(prevBtn);
      }
    }
    expect(prevBtn).toBeDisabled();
    expect(screen.getByText('January')).toBeInTheDocument();
  });

  it('keeps data visible and displays updating indicator when isFetching is true without layout collapse', () => {
    mockUseServiceAttendanceQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    render(<ServiceAttendanceHistoryTab memberId="user-1" />);

    expect(screen.getByText('(updating...)')).toBeInTheDocument();
    expect(screen.getByText('4 Total')).toBeInTheDocument();
    expect(screen.queryByText('Loading attendance history...')).not.toBeInTheDocument();
  });
});
