import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { AdminServicesPage } from '../index';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    data: {
      adminRole: 'admin',
      isAuthenticated: true,
      session: null,
    },
    isLoading: false,
    error: null,
  }),
}));

const mockUseServiceDashboardQuery = vi.fn();
vi.mock('@/hooks/domain/services', () => ({
  useServiceDashboardQuery: (...args: unknown[]) => mockUseServiceDashboardQuery(...args),
}));

const queryClient = new QueryClient();

describe('AdminServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServiceDashboardQuery.mockReturnValue({
      data: {
        time_slots: {
          '9AM': { committed: 10, present: 8, walk_ins: 2, late_tardy: 1, roles: { Usher: 5 } },
          '12NN': { committed: 20, present: 15, walk_ins: 5, late_tardy: 2, roles: { Usher: 10 } },
          '3PM': {
            committed: 30,
            present: 25,
            walk_ins: 10,
            late_tardy: 3,
            roles: { Usher: 15 },
          },
        },
        roles: ['Usher'],
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders page header and dashboard UI', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Services Dashboard' })).toBeInTheDocument();

    // Check for some data rendering
    expect(screen.getByText('Committed')).toBeInTheDocument();
    expect(screen.getAllByText('10')[0]).toBeInTheDocument();
    expect(screen.getAllByText('20')[0]).toBeInTheDocument();
    expect(screen.getAllByText('30')[0]).toBeInTheDocument();

    const dataButton = screen.getByRole('button', { name: 'Attendance Data' });
    fireEvent.click(dataButton);
    expect(mockedNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminServiceAttendanceData);

    const ctaButton = screen.getByRole('button', { name: 'Upload CSV' });
    fireEvent.click(ctaButton);
    expect(mockedNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminServiceAttendanceMigration);
  });

  it('renders safely without crashing when roles is null or empty', () => {
    mockUseServiceDashboardQuery.mockReturnValue({
      data: {
        time_slots: {
          '9AM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, roles: {} },
          '12NN': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, roles: {} },
          '3PM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, roles: {} },
        },
        roles: null as unknown as string[],
      },
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Services Dashboard' })).toBeInTheDocument();
  });

  it('renders safely without crashing when some time slot keys are undefined', () => {
    mockUseServiceDashboardQuery.mockReturnValue({
      data: {
        time_slots: {},
        roles: [],
      },
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Services Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Committed')).toBeInTheDocument();
  });

  it('supports Sunday navigation (prev/next) and switching to Month and Annual views', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Starts in Sunday mode by default
    expect(screen.getByRole('tab', { name: 'Sunday' })).toBeInTheDocument();
    const prevSundayBtn = screen.getByRole('button', { name: 'Previous Sunday' });
    const nextSundayBtn = screen.getByRole('button', { name: 'Next Sunday' });
    expect(prevSundayBtn).toBeInTheDocument();
    expect(nextSundayBtn).toBeInTheDocument();

    // Click Prev Sunday
    fireEvent.click(prevSundayBtn);
    // Should still have Sunday view active
    expect(mockUseServiceDashboardQuery).toHaveBeenCalled();

    // Switch to Month view
    const monthBtn = screen.getByRole('tab', { name: 'Month' });
    fireEvent.click(monthBtn);
    expect(screen.getByRole('button', { name: 'Previous Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next Month' })).toBeInTheDocument();

    // Switch to Annual view
    const annualBtn = screen.getByRole('tab', { name: 'Annual' });
    fireEvent.click(annualBtn);
    expect(screen.getByRole('button', { name: 'Previous Year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next Year' })).toBeInTheDocument();
  });

  it('renders loading spinner when isLoading is true', () => {
    mockUseServiceDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Services Dashboard' })).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error state when isError is true or stats is missing', () => {
    mockUseServiceDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('There was an error fetching the service dashboard statistics.'),
    ).toBeInTheDocument();
  });

  it('renders turn-up rates and badges correctly with low attendance (<50%)', () => {
    mockUseServiceDashboardQuery.mockReturnValue({
      data: {
        time_slots: {
          '9AM': { committed: 10, present: 2, walk_ins: 0, late_tardy: 0, roles: {} },
          '12NN': { committed: 10, present: 2, walk_ins: 0, late_tardy: 0, roles: {} },
          '3PM': { committed: 10, present: 2, walk_ins: 0, late_tardy: 0, roles: {} },
        },
        roles: ['Usher'],
      },
      isLoading: false,
      isError: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('20% Avg')).toBeInTheDocument();
  });

  it('enforces filter boundaries and handles dropdown changes and step-overs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
          <AdminServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Initial state: on maxSunday, so Next Sunday is disabled
    const nextSundayBtn = screen.getByRole('button', { name: 'Next Sunday' });
    expect(nextSundayBtn).toBeDisabled();

    // Clicking previous enables next
    const prevSundayBtn = screen.getByRole('button', { name: 'Previous Sunday' });
    expect(prevSundayBtn).not.toBeDisabled();
    fireEvent.click(prevSundayBtn);
    expect(screen.getByRole('button', { name: 'Next Sunday' })).not.toBeDisabled();

    // Click Next Sunday to return to maxSunday
    fireEvent.click(screen.getByRole('button', { name: 'Next Sunday' }));
    expect(screen.getByRole('button', { name: 'Next Sunday' })).toBeDisabled();

    // Select Sunday from dropdown
    const sundaySelectBtn = screen.getByRole('button', { name: 'Select Sunday' });
    fireEvent.click(sundaySelectBtn);
    const sundayOption = screen.getAllByRole('option')[1];
    fireEvent.click(sundayOption);

    // Month mode: on current month & year (March 2026), so Next Month is disabled
    fireEvent.click(screen.getByRole('tab', { name: 'Month' }));
    const nextMonthBtn = screen.getByRole('button', { name: 'Next Month' });
    const prevMonthBtn = screen.getByRole('button', { name: 'Previous Month' });
    expect(nextMonthBtn).toBeDisabled();
    expect(prevMonthBtn).not.toBeDisabled();

    // Click Previous Month (March -> February)
    fireEvent.click(prevMonthBtn);
    expect(screen.getByRole('button', { name: 'Next Month' })).not.toBeDisabled();

    // Click Next Month (February -> March) to exercise non-December increment
    fireEvent.click(screen.getByRole('button', { name: 'Next Month' }));
    expect(screen.getByRole('button', { name: 'Next Month' })).toBeDisabled();

    // Step back to February then January
    fireEvent.click(prevMonthBtn);
    fireEvent.click(prevMonthBtn);

    // Click Previous Month from January 2026 -> wraps to December 2025
    fireEvent.click(prevMonthBtn);

    // Click Next Month from December 2025 -> wraps to January 2026
    fireEvent.click(screen.getByRole('button', { name: 'Next Month' }));

    // Select month from month dropdown
    const monthSelectBtn = screen.getByRole('button', { name: 'Select month' });
    fireEvent.click(monthSelectBtn);
    const monthOptions = screen.getAllByRole('option');
    // Select first month (January)
    fireEvent.click(monthOptions[0]);

    // Select year in month mode
    const yearSelectBtn = screen.getByRole('button', { name: 'Select year' });
    fireEvent.click(yearSelectBtn);
    const year2025Option = screen.getByRole('option', { name: '2025' });
    fireEvent.click(year2025Option);

    // Now in 2025, pick December
    fireEvent.click(screen.getByRole('button', { name: 'Select month' }));
    const decOption = screen.getByRole('option', { name: 'December' });
    fireEvent.click(decOption);

    // Switch year back to 2026, which triggers the clamp to currentMonth (March)
    fireEvent.click(screen.getByRole('button', { name: 'Select year' }));
    const year2026Option = screen.getByRole('option', { name: '2026' });
    fireEvent.click(year2026Option);

    // Annual mode
    fireEvent.click(screen.getByRole('tab', { name: 'Annual' }));
    const nextYearBtn = screen.getByRole('button', { name: 'Next Year' });
    const prevYearBtn = screen.getByRole('button', { name: 'Previous Year' });
    expect(nextYearBtn).toBeDisabled();
    expect(prevYearBtn).not.toBeDisabled();

    // Click Previous Year (2026 -> 2025)
    fireEvent.click(prevYearBtn);
    // At MIN_YEAR (2025), Previous Year is disabled
    expect(screen.getByRole('button', { name: 'Previous Year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next Year' })).not.toBeDisabled();

    // Click Next Year (2025 -> 2026)
    fireEvent.click(screen.getByRole('button', { name: 'Next Year' }));
    expect(screen.getByRole('button', { name: 'Next Year' })).toBeDisabled();

    // Select year from Annual dropdown
    const annualYearSelect = screen.getByRole('button', { name: 'Select year' });
    fireEvent.click(annualYearSelect);
    const annual2025Option = screen.getByRole('option', { name: '2025' });
    fireEvent.click(annual2025Option);

    vi.useRealTimers();
  });
});
