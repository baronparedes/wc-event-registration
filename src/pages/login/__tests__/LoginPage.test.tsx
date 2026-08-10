import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '@/pages/login';

const {
  mockNavigate,
  mockUseLocation,
  mockUseAdminAuthQuery,
  mockUseAdminLoginMutation,
  mockLoginMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseLocation: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockUseAdminLoginMutation: vi.fn(),
  mockLoginMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: () => mockUseAdminAuthQuery(),
    useAdminLoginMutation: () => mockUseAdminLoginMutation(),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: false },
      isLoading: false,
    });
    mockLoginMutateAsync.mockResolvedValue({ isAuthenticated: true });
    mockUseAdminLoginMutation.mockReturnValue({
      mutateAsync: mockLoginMutateAsync,
      isPending: false,
    });
  });

  it('submits admin credentials and navigates on success', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password *'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'secret',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Welcome back. Admin access granted.');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/events', { replace: true });
  });

  it('navigates to redirect target from query param after successful login', async () => {
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search:
        '?redirect=%2Fadmin%2Fevents%2F95de6bf2-def7-462b-917e-2a3961f5b51c%2Fattendance%2Fdata',
      hash: '',
      state: null,
      key: 'redirect',
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password *'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'secret',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/admin/events/95de6bf2-def7-462b-917e-2a3961f5b51c/attendance/data',
      { replace: true },
    );
  });

  it('redirects authenticated admins immediately', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true },
      isLoading: false,
    });

    render(<LoginPage />);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/events', { replace: true });
  });

  it('falls back to admin events for unsafe redirect targets', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      search: '?redirect=https%3A%2F%2Fevil.example.com%2Fsteal',
      hash: '',
      state: null,
      key: 'unsafe',
    });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true },
      isLoading: false,
    });

    render(<LoginPage />);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/events', { replace: true });
  });

  it('shows API error message when login fails with an Error instance', async () => {
    mockLoginMutateAsync.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password *'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('falls back to default error toast for non-Error rejections', async () => {
    mockLoginMutateAsync.mockRejectedValueOnce('bad response');

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password *'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to sign in as admin.');
    });
  });

  it('renders pending submit state while login mutation is in-flight', () => {
    mockUseAdminLoginMutation.mockReturnValue({
      mutateAsync: mockLoginMutateAsync,
      isPending: true,
    });

    render(<LoginPage />);

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });
});
