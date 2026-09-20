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

vi.mock('@/hooks/domain/services', () => ({
  useServiceDashboardQuery: () => ({
    data: {
      time_slots: {
        '9:00 AM': { committed: 10, present: 8, walk_ins: 2, late_tardy: 1, roles: { Usher: 5 } },
        '12NN': { committed: 20, present: 15, walk_ins: 5, late_tardy: 2, roles: { Usher: 10 } },
        '3:00 PM': {
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
  }),
}));

const queryClient = new QueryClient();

describe('AdminServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();

    const ctaButton = screen.getByRole('button', { name: 'Import Records' });
    fireEvent.click(ctaButton);
    expect(mockedNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminServiceAttendanceMigration);
  });
});
