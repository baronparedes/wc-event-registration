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

    const ctaButton = screen.getByRole('button', { name: 'Import Records' });
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
});
