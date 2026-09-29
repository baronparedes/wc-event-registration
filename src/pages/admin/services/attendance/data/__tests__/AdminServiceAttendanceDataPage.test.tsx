import { faker } from '@faker-js/faker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const firstVolunteerName = faker.person.fullName();
const firstVolunteerNickname = faker.person.firstName();
const secondVolunteerName = faker.person.fullName();

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
      full_name: firstVolunteerName,
      nickname: firstVolunteerNickname,
      avatar_object_key: 'avatars/member.jpg',
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
      full_name: secondVolunteerName,
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

  afterEach(() => vi.unstubAllGlobals());

  it('groups records into date summaries and cards on narrow viewports', () => {
    vi.stubGlobal('innerWidth', 375);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/2 members, 2 check-ins/)).toBeInTheDocument();
    expect(screen.getByText(firstVolunteerName)).toBeInTheDocument();
    expect(screen.getByText(secondVolunteerName)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'RFID' })).not.toBeInTheDocument();
  });

  it('shows the mobile empty state when no records match', () => {
    vi.stubGlobal('innerWidth', 375);
    mockUseServiceAttendanceQuery.mockReturnValue(makeMockInfiniteQueryResult([]));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('No attendance records found matching filters.')).toBeInTheDocument();
    expect(screen.queryByText(firstVolunteerName)).not.toBeInTheDocument();
  });

  it('renders table columns, volunteer names, and avatars', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(firstVolunteerName)).toBeInTheDocument();
    expect(screen.getByText(firstVolunteerNickname)).toBeInTheDocument();
    expect(screen.getByText(secondVolunteerName)).toBeInTheDocument();
    expect(screen.getByText('RFID001')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getAllByText('Walk-in').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Late Check-In').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct count badge when all records are loaded', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('2 records found').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Showing X of Y" in badge when more pages exist', () => {
    const query = makeMockInfiniteQueryResult(mockAttendanceRecords, true);
    mockUseServiceAttendanceQuery.mockReturnValue(query);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('Showing 2 of 100 records').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));
    expect(query.fetchNextPage).toHaveBeenCalledOnce();
  });

  it('filters roles locally while passing date, slot and attendance flags to the query', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/admin/services/attendance/data?role=Usher&service_start_date=2026-03-15&service_end_date=2026-03-15&time_slot=9AM&is_walk_in=false&is_late_tardy=true',
          ]}
        >
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(mockUseServiceAttendanceQuery).toHaveBeenCalledWith({
      start_date: '2026-03-15',
      end_date: '2026-03-15',
      time_slot: '9AM',
      is_walk_in: false,
      is_override: true,
    });
    expect(screen.getByText(firstVolunteerName)).toBeInTheDocument();
    expect(screen.queryByText(secondVolunteerName)).not.toBeInTheDocument();
    expect(screen.getAllByText('1 record found').length).toBeGreaterThanOrEqual(1);
  });

  it('adds and removes role filters and restores all records when cleared', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'OIC' }));
    expect(screen.queryByText(firstVolunteerName)).not.toBeInTheDocument();
    expect(screen.getByText(secondVolunteerName)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Usher' }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent('2 roles selected');
    expect(screen.getByText(firstVolunteerName)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'OIC' }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent('Usher');
    expect(screen.queryByText(secondVolunteerName)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All roles' }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(secondVolunteerName)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('button', { name: 'Role' })).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Role' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Role' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters volunteers by debounced nickname search', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('Search by name or nickname'), {
      target: { value: firstVolunteerNickname },
    });

    await waitFor(() => expect(screen.queryByText(secondVolunteerName)).not.toBeInTheDocument());
    expect(screen.getByText(firstVolunteerName)).toBeInTheDocument();
    expect(screen.getAllByText('2 records found').length).toBeGreaterThanOrEqual(1);
  });

  it('shows an empty result when the selected role has no matching records', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data?role=Prayer%20Coach']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No attendance records found matching filters.')).toBeInTheDocument();
    expect(screen.queryByText(firstVolunteerName)).not.toBeInTheDocument();
  });

  it('hides attendance records and disables export while loading', () => {
    mockUseServiceAttendanceQuery.mockReturnValue({
      ...makeMockInfiniteQueryResult(mockAttendanceRecords),
      isLoading: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByText(firstVolunteerName)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeDisabled();
  });

  it('handles clear filter button state and click', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    // nearest previous Sunday to 2026-03-15 is 2026-03-15 itself (it's a Sunday)
    const expectedFallback = '2026-03-15';

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/data']}>
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
    expect(screen.getByText(firstVolunteerName)).toBeInTheDocument();
    expect(screen.getByText(secondVolunteerName)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('clears the end date when the start date is removed', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/admin/services/attendance/data?service_start_date=2026-03-01&service_end_date=2026-03-15',
          ]}
        >
          <AdminServiceAttendanceDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const [start, end] = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    expect(end).toHaveValue('2026-03-15');

    fireEvent.change(start, { target: { value: '' } });

    expect(end).toBeDisabled();
    expect(mockUseServiceAttendanceQuery).toHaveBeenLastCalledWith({
      start_date: expect.any(String),
      end_date: expect.any(String),
    });
  });
});
