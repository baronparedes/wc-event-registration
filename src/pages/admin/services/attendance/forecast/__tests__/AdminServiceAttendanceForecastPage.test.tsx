import { faker } from '@faker-js/faker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import { AdminServiceAttendanceForecastPage } from '../index';

const {
  mockUseAdminMembersSchedulesQuery,
  mockUseMembersAttendanceScoresQuery,
  mockUseGetExcusedMembers,
} = vi.hoisted(() => ({
  mockUseAdminMembersSchedulesQuery: vi.fn(),
  mockUseMembersAttendanceScoresQuery: vi.fn(),
  mockUseGetExcusedMembers: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMembersSchedulesQuery: () => mockUseAdminMembersSchedulesQuery(),
  useMembersAttendanceScoresQuery: () => mockUseMembersAttendanceScoresQuery(),
  useGetExcusedMembers: (...args: unknown[]) => mockUseGetExcusedMembers(...args),
}));

describe('AdminServiceAttendanceForecastPage', () => {
  let queryClient: QueryClient;

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const dummyMember: AdminMember = {
    id: 'user-1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    first_name: firstName,
    last_name: lastName,
    nickname: faker.person.firstName(),
    full_name: `${firstName} ${lastName}`,
    email: faker.internet.exampleEmail({ firstName, lastName }),
    phone: '123-456',
    date_of_birth: '1990-01-01',
    category: 'adult',
    role: 'Usher',
    extra_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const dummyScheduleEntries: MemberScheduleEntry[] = [
    {
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
      member: dummyMember,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: dummyScheduleEntries,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseMembersAttendanceScoresQuery.mockReturnValue({
      data: new Map([['user-1', { turnupRate: 0.85, attendedCount: 8, totalCount: 10 }]]),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseGetExcusedMembers.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/services/attendance/forecast']}>
          <AdminServiceAttendanceForecastPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders the header, subnav links, and page title', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /Sunday Attendance Forecast/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Monthly turnup expectations and role deficit forecasting for Sunday services/i,
      ),
    ).toBeInTheDocument();

    // Check SubNav links (Services appears in breadcrumb and SubNav)
    expect(screen.getAllByRole('link', { name: /Services/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /Commitment Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Attendance Data/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Attendance Forecast/i })).toBeInTheDocument();
  });

  it('renders month navigator, role group tabs, month summary, and commitment table', () => {
    renderPage();

    // Check Role Group tabs using accessible role="tab"
    expect(screen.getByRole('tab', { name: /Usher & Backroom/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Prayer Coach/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /IMT & VMT/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /All Roles/i })).toBeInTheDocument();

    expect(screen.getByText(/Sundays in Month/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Monthly Quota/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Expected Turnup/i).length).toBeGreaterThanOrEqual(1);

    // Check simplified commitment table matching user specification
    expect(screen.getAllByText(/USHER\/BACKROOM COMMITMENTS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SESSION/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/TARGET/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SCHEDULED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CONFIRMED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Over/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows navigating to previous and next months', () => {
    renderPage();

    const prevButton = screen.getByRole('button', { name: /Previous Month/i });
    fireEvent.click(prevButton);

    // After clicking previous month, "This Month" button appears
    expect(screen.getByRole('button', { name: /This Month/i })).toBeInTheDocument();

    // Click "This Month" to reset
    fireEvent.click(screen.getByRole('button', { name: /This Month/i }));
    expect(screen.queryByRole('button', { name: /This Month/i })).not.toBeInTheDocument();
  });

  it('allows changing role group tabs and updates table header', () => {
    renderPage();

    const pcTab = screen.getByRole('tab', { name: /Prayer Coach/i });
    fireEvent.click(pcTab);

    expect(pcTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/PRAYER COACH COMMITMENTS/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens and closes Configure Targets modal', () => {
    renderPage();

    const configButton = screen.getByRole('button', { name: /Configure Targets/i });
    fireEvent.click(configButton);

    expect(
      screen.getByRole('heading', { name: /Configure Volunteer Targets/i }),
    ).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(
      screen.queryByRole('heading', { name: /Configure Volunteer Targets/i }),
    ).not.toBeInTheDocument();
  });

  it('renders loading state when data is loading', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/Calculating attendance forecasts.../i)).toBeInTheDocument();
  });

  it('renders error banner and retry button when query fails', () => {
    const mockRefetch = vi.fn();
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: mockRefetch,
    });

    renderPage();

    expect(
      screen.getByText(/Failed to load service schedules or attendance statistics/i),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });
});
