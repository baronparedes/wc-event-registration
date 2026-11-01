import { faker } from '@faker-js/faker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
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

vi.mock('recharts', async () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
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
    notes: [],
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
    expect(screen.getByRole('tab', { name: /All Roles/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Prayer Coach/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Usher/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Backroom/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /IMT Support/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /VMT Support/i })).toBeInTheDocument();

    expect(screen.getByText(/Sundays in Month/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Monthly Quota/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Expected Turnup/i).length).toBeGreaterThanOrEqual(1);

    // Default: Chart view is rendered
    expect(screen.getAllByText(/ALL VOLUNTEER COMMITMENTS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('composed-chart').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Total Target/i).length).toBeGreaterThanOrEqual(1);

    // Switch to Table view
    const tableToggleButtons = screen.getAllByRole('button', { name: /Table/i });
    fireEvent.click(tableToggleButtons[0]);

    // Check table headers
    expect(screen.getAllByText(/SESSION/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/TARGET/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SCHEDULED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/EXPECTED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/VARIANCE/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows navigating to previous and next months', () => {
    renderPage();

    const thisMonthBtn = screen.getByRole('button', { name: /This Month/i });
    expect(thisMonthBtn).toBeDisabled();

    const prevButton = screen.getByRole('button', { name: /Previous Month/i });
    fireEvent.click(prevButton);

    // After clicking previous month, "This Month" button is enabled
    expect(thisMonthBtn).toBeEnabled();

    // Click "This Month" to reset
    fireEvent.click(thisMonthBtn);
    expect(thisMonthBtn).toBeDisabled();
  });

  it('allows changing role group tabs and updates table header', () => {
    renderPage();

    // Default: All Roles is selected, so Individual Role Breakdown is visible
    expect(screen.getAllByText(/Individual Role Breakdown/i).length).toBeGreaterThan(0);

    const pcTab = screen.getByRole('tab', { name: /Prayer Coach/i });
    fireEvent.click(pcTab);

    expect(pcTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/PRAYER COACH COMMITMENTS/i).length).toBeGreaterThanOrEqual(1);

    // When an individual role is selected, Individual Role Breakdown is hidden
    expect(screen.queryByText(/Individual Role Breakdown/i)).not.toBeInTheDocument();
  });

  it('allows filtering by individual Sunday tab', () => {
    renderPage();

    const monthName = format(new Date(), 'MMMM');
    const monthRegex = new RegExp(monthName, 'i');

    const allSundaysTab = screen.getByRole('tab', { name: /All Sundays/i });
    expect(allSundaysTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: /Monthly Attendance Trend/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: monthRegex }).length).toBeGreaterThan(
      1,
    );

    const firstSundayTab = screen.getByRole('tab', { name: /1st Sunday/i });
    fireEvent.click(firstSundayTab);

    expect(firstSundayTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('heading', { level: 3, name: monthRegex })).toHaveLength(1);

    fireEvent.click(allSundaysTab);
    expect(screen.getAllByRole('heading', { level: 3, name: monthRegex }).length).toBeGreaterThan(
      1,
    );
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

  it('opens and closes Share Forecast modal', () => {
    renderPage();

    const shareButton = screen.getByRole('button', { name: /Share Forecast/i });
    fireEvent.click(shareButton);

    expect(screen.getByText(/Share Sunday Attendance Forecast/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/Share Sunday Attendance Forecast/i)).not.toBeInTheDocument();
  });

  it('renders Export CSV button and triggers download', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    renderPage();

    const exportButton = screen.getByRole('button', { name: /Export CSV/i });
    expect(exportButton).toBeInTheDocument();
    fireEvent.click(exportButton);

    expect(createObjectURLMock).toHaveBeenCalled();
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
