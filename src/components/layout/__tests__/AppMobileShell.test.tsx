import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS, TOAST_MESSAGES } from '@/config/constants';

import { AppMobileShell } from '../AppMobileShell';

const { mockUseAdminAuthQuery, mockMutateAsync, mockToastSuccess, mockToastError, mockNavigate } =
  vi.hoisted(() => ({
    mockUseAdminAuthQuery: vi.fn(),
    mockMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
  }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
  useAdminLogoutMutation: () => ({ mutateAsync: mockMutateAsync }),
}));

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<AppMobileShell />}>
          <Route path="*" element={<div>Outlet Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppMobileShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('shows mobile menu actions for unauthenticated users', () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: false } });

    renderShell('/admin/events');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminLogin);
  });

  it('navigates from mobile events button', () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } });

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Events' }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.home);
  });

  it('handles successful mobile sign out', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } });

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledWith(TOAST_MESSAGES.adminSignOutSuccess);
    });
  });

  it('handles failed mobile sign out', async () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: { isAuthenticated: true } });
    mockMutateAsync.mockRejectedValue(new Error('mobile logout failed'));

    renderShell('/');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('mobile logout failed');
    });
  });
});
