import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExcusedMemberRecord } from '@/hooks/domain/members';
import type { ServiceAttendance } from '@/lib/domain/services';

import { ServiceAttendanceHistoryTab } from '../ServiceAttendanceHistoryTab';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

interface MockExcusedQueryResult {
  data?: ExcusedMemberRecord[];
  isLoading?: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
}

const {
  mockUseServiceAttendanceQuery,
  mockUseUserCommitmentHistoryQuery,
  mockUseGetMemberExcusedSchedule,
} = vi.hoisted(() => ({
  mockUseServiceAttendanceQuery: vi.fn(),
  mockUseUserCommitmentHistoryQuery: vi.fn(),
  mockUseGetMemberExcusedSchedule: vi.fn<
    (
      year?: number,
      monthIndex?: number,
      userId?: string,
      options?: { enabled?: boolean },
    ) => MockExcusedQueryResult
  >(() => ({ data: [] })),
}));

vi.mock('@/hooks/domain/services', () => ({
  useServiceAttendanceQuery: (...args: unknown[]) => mockUseServiceAttendanceQuery(...args),
  useUserCommitmentHistoryQuery: (...args: unknown[]) => mockUseUserCommitmentHistoryQuery(...args),
}));

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useGetMemberExcusedSchedule: (
      year: number,
      monthIndex: number,
      userId?: string,
      options?: { enabled?: boolean },
    ) => mockUseGetMemberExcusedSchedule(year, monthIndex, userId, options),
  };
});

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
      table_number: 'Usher / Backroom / IMT / VMT',
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

function makeAttendanceQueryResult(
  items: ServiceAttendance[],
  overrides: Record<string, unknown> = {},
) {
  return {
    data: {
      pages: [{ items, nextCursor: null, hasMore: false, totalCount: items.length, totalPages: 1 }],
      pageParams: [null],
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  };
}

describe('ServiceAttendanceHistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServiceAttendanceQuery.mockReturnValue(makeAttendanceQueryResult(sampleAttendance));

    mockUseUserCommitmentHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it('renders section card header and navigation controls', () => {
    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Service Commitment History' }),
    ).toBeInTheDocument();
    expect(screen.getByText('View your service attendance by month.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(
      makeAttendanceQueryResult([], { isLoading: true }),
    );

    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('Loading attendance history...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(makeAttendanceQueryResult([], { isError: true }));

    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('Failed to load attendance history.')).toBeInTheDocument();
  });

  it('renders matrix table consistently even when no attendance records exist', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(makeAttendanceQueryResult([]));

    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('0 Total')).toBeInTheDocument();
    expect(screen.getByText('Schedule Alignment:')).toBeInTheDocument();
    expect(screen.getAllByText('1st Sunday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9AM').length).toBeGreaterThan(0);
  });

  it('renders monthly attendance matrix with records, Sundays, and status badges', () => {
    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);

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

    expect(screen.getAllByText('Walk-in').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Override').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Assignment:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('14, Seat 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Usher / Backroom / IMT / VMT').length).toBeGreaterThan(0);
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

    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" metadata={metadata} />);

    expect(screen.getAllByText('Committed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unscheduled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No Check-In (Committed)').length).toBeGreaterThan(0);
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

    mockUseServiceAttendanceQuery.mockReturnValue(makeAttendanceQueryResult(nonSundayData));

    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);
    expect(screen.getByText('Other Services Attended')).toBeInTheDocument();
    expect(screen.getByText('2026-09-18 • 7PM')).toBeInTheDocument();
  });

  it('navigates to next and previous months and today', () => {
    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);

    const nextBtn = screen.getByRole('button', { name: 'Next month' });
    fireEvent.click(nextBtn);

    expect(mockUseServiceAttendanceQuery).toHaveBeenCalled();

    const prevBtn = screen.getByRole('button', { name: 'Previous month' });
    fireEvent.click(prevBtn);

    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);
  });

  it('allows explicitly selecting a year and respects month bounds', () => {
    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);

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
    mockUseServiceAttendanceQuery.mockReturnValue(
      makeAttendanceQueryResult(sampleAttendance, { isFetching: true }),
    );

    renderWithClient(<ServiceAttendanceHistoryTab memberId="user-1" />);

    expect(screen.getByText('(updating...)')).toBeInTheDocument();
    expect(screen.getByText('4 Total')).toBeInTheDocument();
    expect(screen.queryByText('Loading attendance history...')).not.toBeInTheDocument();
  });

  it('keeps table layout stable and displays in-cell loading shimmers instead of false missed statuses when isPlaceholderData is true', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(
      makeAttendanceQueryResult(sampleAttendance, { isFetching: true }),
    );

    renderWithClient(
      <ServiceAttendanceHistoryTab
        memberId="user-1"
        metadata={{ first_sunday: '9AM', second_sunday: '9AM' }}
      />,
    );

    // Table structure remains intact
    expect(screen.getByText('Schedule Alignment:')).toBeInTheDocument();
    expect(screen.getAllByText('1st Sunday').length).toBeGreaterThan(0);
  });

  it('does not display missed commitment while excused query is still loading', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(
      makeAttendanceQueryResult([]), // Attendance returned empty (user did not attend)
    );
    mockUseGetMemberExcusedSchedule.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isPlaceholderData: false,
    });

    renderWithClient(
      <ServiceAttendanceHistoryTab memberId="user-1" metadata={{ first_sunday: '9AM' }} />,
    );

    // In-cell loading skeleton is displayed for the pending committed cell while waiting for excused records
    expect(screen.getAllByTestId('service-matrix-cell-loading').length).toBeGreaterThan(0);
    // Never displays false missed commitments while excused records are in-flight
    expect(screen.queryByText('Scheduled slot, no check-in recorded')).not.toBeInTheDocument();
    expect(screen.queryByText(/No-Check In$/)).not.toBeInTheDocument();
  });

  it('does not display missed commitment while excused query is refetching without data', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(makeAttendanceQueryResult([]));
    mockUseGetMemberExcusedSchedule.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true, // e.g. refetching / month change without previous data
      isPlaceholderData: false,
    });

    renderWithClient(
      <ServiceAttendanceHistoryTab memberId="user-1" metadata={{ first_sunday: '9AM' }} />,
    );

    // In-cell loading skeleton is displayed, never premature missed
    expect(screen.getAllByTestId('service-matrix-cell-loading').length).toBeGreaterThan(0);
    expect(screen.queryByText(/No-Check In$/)).not.toBeInTheDocument();
  });

  it('displays excused immediately without loading skeleton when excused record is already present during refetch', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(makeAttendanceQueryResult([]));
    mockUseGetMemberExcusedSchedule.mockReturnValue({
      data: [
        {
          memberId: 'user-1',
          requestDate: '2026-09-06',
          services: '9AM',
          reason: 'Family event',
        },
      ],
      isLoading: false,
      isFetching: true, // background refetch with cached data
      isPlaceholderData: false,
    });

    renderWithClient(
      <ServiceAttendanceHistoryTab memberId="user-1" metadata={{ first_sunday: '9AM' }} />,
    );

    // Displays excused badge immediately, not loading skeleton or missed
    expect(screen.getAllByText('Excused').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('service-matrix-cell-loading')).not.toBeInTheDocument();
    expect(screen.queryByText(/No-Check In$/)).not.toBeInTheDocument();
  });
});
