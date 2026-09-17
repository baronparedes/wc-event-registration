import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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

describe('AdminServicesPage', () => {
  it('renders page header, sub-navigation, and empty state', () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.adminServices]}>
        <AdminServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Manage Services' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      ROUTE_PATHS.adminServices,
    );
    expect(screen.getByText('Service Management Coming Soon')).toBeInTheDocument();

    const ctaButton = screen.getByRole('button', { name: 'Go to Attendance Migration' });
    fireEvent.click(ctaButton);
    expect(mockedNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminServiceAttendanceMigration);
  });
});
