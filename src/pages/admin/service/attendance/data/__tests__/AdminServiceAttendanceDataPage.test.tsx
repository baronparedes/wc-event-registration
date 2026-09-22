import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServiceAttendance } from '@/lib/domain/services';

import { AdminServiceAttendanceDataPage } from '../index';

const mockUseServiceAttendanceQuery = vi.fn();

vi.mock('@/hooks/domain/services', () => ({
  useServiceAttendanceQuery: (...args: unknown[]) => mockUseServiceAttendanceQuery(...args),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    data: { adminRole: 'admin', isAuthenticated: true, session: null },
    isLoading: false,
    error: null,
  }),
}));

const queryClient = new QueryClient();

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
  {
    id: 'rec-2',
    user_id: 'user-2',
    rfid: 'RFID002',
    service_date: '2026-03-15',
    time_slot: '9AM',
    checked_in_at: '2026-03-15T09:40:00Z',
    is_walk_in: true,
    is_override: true,
    is_manual_entry: false,
    service_seat_id: null,
    metadata: { role: 'OIC' },
    created_at: '2026-03-15T09:40:00Z',
    updated_at: '2026-03-15T09:40:00Z',
    created_by: null,
    updated_by: null,
    service_seats: null,
    user: {
      member_id: 'RFID002',
      full_name: 'John Smith',
      nickname: null,
      avatar_object_key: null,
    },
  },
];

function makeMockInfiniteQueryResult(items: ServiceAttendance[], hasNextPage = false) {
  return {
    data: {
      pages: [
        {
          items,
          nextCursor: hasNextPage ? '50' : null,
          hasMore: hasNextPage,
          totalCount: hasNextPage ? 100 : items.length,
          totalPages: hasNextPage ? 2 : 1,
        },
      ],
      pageParams: [null],
    },
    isLoading: false,
    isError: false,
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  };
}

describe('AdminServiceAttendanceDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServiceAttendanceQuery.mockReturnValue(
      makeMockInfiniteQueryResult(mockAttendanceRecords),
    );
  });

  it('renders table columns, volunteer names, and avatars', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/service/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('RFID001')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getAllByText('Walk-in').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Late Check-In').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct count badge when all records are loaded', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/service/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('2 records found').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Showing X of Y" in badge when more pages exist', () => {
    mockUseServiceAttendanceQuery.mockReturnValue(
      makeMockInfiniteQueryResult(mockAttendanceRecords, true),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/service/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('Showing 2 of 100 records').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
  });

  it('handles clear filter button state and click', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    // nearest previous Sunday to 2026-03-15 is 2026-03-15 itself (it's a Sunday)
    const expectedFallback = '2026-03-15';

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/service/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const clearButton = screen.getByRole('button', { name: 'Clear filters' });
    // Initially no explicit filters are active, so button is disabled
    expect(clearButton).toBeDisabled();

    // Start Date input shows the fallback date by default
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
    expect(dateInput.value).toBe(expectedFallback);

    // Change Start Date to a different date — this activates the clear button
    fireEvent.change(dateInput, { target: { value: '2026-03-08' } });
    expect(clearButton).not.toBeDisabled();

    // Click clear filters
    fireEvent.click(clearButton);

    // After clearing, button is disabled again and Start Date reverts to fallback
    expect(clearButton).toBeDisabled();
    expect(dateInput.value).toBe(expectedFallback);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
