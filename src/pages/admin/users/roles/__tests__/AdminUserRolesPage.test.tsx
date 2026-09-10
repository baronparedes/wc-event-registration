import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminUserRolesPage } from '@/pages/admin/users/roles';

const {
  mockUseAdminRolesQuery,
  mockUseAuthUsersQuery,
  mockAssignMutateAsync,
  mockUpdateMutateAsync,
  mockRevokeMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseAdminRolesQuery: vi.fn(),
  mockUseAuthUsersQuery: vi.fn(),
  mockAssignMutateAsync: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockRevokeMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

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
    useAdminRolesQuery: () => mockUseAdminRolesQuery(),
    useAuthUsersQuery: (search: string, enabled: boolean) => mockUseAuthUsersQuery(search, enabled),
    useAssignAdminRoleMutation: () => ({
      mutateAsync: mockAssignMutateAsync,
      isPending: false,
    }),
    useUpdateAdminRoleMutation: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
    useRevokeAdminRoleMutation: () => ({
      mutateAsync: mockRevokeMutateAsync,
      isPending: false,
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUserRolesPage />
    </MemoryRouter>,
  );
}

const mockAssignments = [
  {
    id: 'admin-row-1',
    auth_user_id: 'user-id-super',
    email: 'superadmin@example.com',
    role: 'super_admin' as const,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'admin-row-2',
    auth_user_id: 'user-id-admin',
    email: 'regularadmin@example.com',
    role: 'admin' as const,
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'admin-row-3',
    auth_user_id: 'user-id-slod',
    email: 'sloduser@example.com',
    role: 'slod' as const,
    created_at: '2026-02-02T00:00:00Z',
  },
  {
    id: 'admin-row-4',
    auth_user_id: 'user-id-imt',
    email: 'imtuser@example.com',
    role: 'imt' as const,
    created_at: '2026-02-03T00:00:00Z',
  },
  {
    id: 'admin-row-5',
    auth_user_id: 'user-id-kiosk',
    email: 'kioskuser@example.com',
    role: 'kiosk' as const,
    created_at: '2026-02-04T00:00:00Z',
  },
];

describe('AdminUserRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminRolesQuery.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
    });
    mockUseAuthUsersQuery.mockReturnValue({
      data: [
        {
          id: 'user-id-new',
          email: 'newuser@example.com',
          created_at: '2026-03-01T00:00:00Z',
          last_sign_in_at: null,
        },
      ],
      isLoading: false,
    });
    mockAssignMutateAsync.mockResolvedValue({});
    mockUpdateMutateAsync.mockResolvedValue({});
    mockRevokeMutateAsync.mockResolvedValue({});
  });

  it('renders loading state', () => {
    mockUseAdminRolesQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderPage();

    expect(screen.getByText('Loading assigned roles...')).toBeInTheDocument();
  });

  it('renders error state when query fails', () => {
    mockUseAdminRolesQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Database error'),
    });

    renderPage();

    expect(
      screen.getByText('Failed to load assigned user roles: Database error'),
    ).toBeInTheDocument();
  });

  it('renders empty state when no roles exist', () => {
    mockUseAdminRolesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText('No roles assigned')).toBeInTheDocument();
  });

  it('renders assigned roles list with all badge types and super_admin protected', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'User Roles', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('superadmin@example.com')).toBeInTheDocument();
    expect(screen.getByText('regularadmin@example.com')).toBeInTheDocument();
    expect(screen.getByText('sloduser@example.com')).toBeInTheDocument();
    expect(screen.getByText('imtuser@example.com')).toBeInTheDocument();
    expect(screen.getByText('kioskuser@example.com')).toBeInTheDocument();

    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('opens assign dialog and assigns a role to a user', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Assign Role to User' }));

    expect(screen.getByText('Assign Role to Auth User')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search by email...');
    fireEvent.change(searchInput, { target: { value: 'new' } });

    fireEvent.click(screen.getByText('newuser@example.com'));

    fireEvent.click(screen.getByRole('button', { name: 'Assign Role' }));

    await waitFor(() => {
      expect(mockAssignMutateAsync).toHaveBeenCalledWith({
        authUserId: 'user-id-new',
        role: 'admin',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Role "admin" assigned to newuser@example.com.');
  });

  it('handles assign error gracefully', async () => {
    mockAssignMutateAsync.mockRejectedValueOnce(new Error('Assign error'));

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Assign Role to User' }));
    fireEvent.click(screen.getByText('newuser@example.com'));
    fireEvent.click(screen.getByRole('button', { name: 'Assign Role' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Assign error');
    });
  });

  it('opens edit dialog and updates an existing role', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit role for regularadmin@example.com' }));

    expect(screen.getByText('Edit Assigned Role')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    fireEvent.click(screen.getByRole('option', { name: 'SLOD' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        adminId: 'admin-row-2',
        role: 'slod',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Role for regularadmin@example.com updated to "slod".',
    );
  });

  it('handles update error gracefully', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error('Update error'));

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit role for regularadmin@example.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    fireEvent.click(screen.getByRole('option', { name: 'SLOD' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Update error');
    });
  });

  it('opens confirm dialog and revokes a role', async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'Revoke role for regularadmin@example.com' }),
    );

    expect(screen.getByText('Revoke User Role')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke Role' }));

    await waitFor(() => {
      expect(mockRevokeMutateAsync).toHaveBeenCalledWith({
        adminId: 'admin-row-2',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Role for regularadmin@example.com has been revoked.',
    );
  });

  it('handles revoke error gracefully', async () => {
    mockRevokeMutateAsync.mockRejectedValueOnce(new Error('Revoke error'));

    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'Revoke role for regularadmin@example.com' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke Role' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Revoke error');
    });
  });
});
