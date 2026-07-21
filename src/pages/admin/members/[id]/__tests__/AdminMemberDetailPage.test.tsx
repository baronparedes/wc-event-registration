import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMemberDetailPage } from '@/pages/admin/members/[id]';

const {
  mockNavigate,
  mockUseParams,
  mockUseAdminAuthQuery,
  mockUseAdminMemberQuery,
  mockUseUpdateMemberMutation,
  mockUseSoftDeleteMemberMutation,
  mockUseRestoreMemberMutation,
  mockUpdateMutateAsync,
  mockDeleteMutateAsync,
  mockRestoreMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockUseAdminMemberQuery: vi.fn(),
  mockUseUpdateMemberMutation: vi.fn(),
  mockUseSoftDeleteMemberMutation: vi.fn(),
  mockUseRestoreMemberMutation: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockDeleteMutateAsync: vi.fn(),
  mockRestoreMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useAdminMemberQuery: (...args: unknown[]) => mockUseAdminMemberQuery(...args),
    useUpdateMemberMutation: () => mockUseUpdateMemberMutation(),
    useSoftDeleteMemberMutation: () => mockUseSoftDeleteMemberMutation(),
    useRestoreMemberMutation: () => mockUseRestoreMemberMutation(),
  };
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <AdminMemberDetailPage />
    </MemoryRouter>,
  );
}

describe('AdminMemberDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'user-1' });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'admin' },
      isLoading: false,
    });
    mockUseUpdateMemberMutation.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    });
    mockUseSoftDeleteMemberMutation.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    });
    mockUseRestoreMemberMutation.mockReturnValue({
      mutateAsync: mockRestoreMutateAsync,
      isPending: false,
    });
    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        is_active: true,
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: 'Janie',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
        extra_metadata: {},
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUpdateMutateAsync.mockResolvedValue(undefined);
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockRestoreMutateAsync.mockResolvedValue(undefined);
  });

  it('renders missing id, loading, and not-found states', () => {
    mockUseParams.mockReturnValue({});

    const { rerender } = renderWithRouter();
    expect(screen.getByText('Member ID is missing.')).toBeInTheDocument();

    mockUseParams.mockReturnValue({ id: 'user-1' });
    mockUseAdminMemberQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
    });

    rerender(
      <MemoryRouter>
        <AdminMemberDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading member...')).toBeInTheDocument();

    mockUseAdminMemberQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: true,
    });

    rerender(
      <MemoryRouter>
        <AdminMemberDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Member not found/i)).toBeInTheDocument();
  });

  it('navigates back when Cancel button is clicked', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/members');
  });

  it('enables save when dirty and submits updated member data', async () => {
    renderWithRouter();

    expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe');

    const saveButton = await screen.findByRole('button', { name: 'Save Changes' });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('First Name *'), {
      target: { value: 'Janet' },
    });
    fireEvent.change(screen.getByLabelText('Last Name *'), {
      target: { value: 'Updated' },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
      expect(screen.getByLabelText('Full Name')).toHaveValue('Janet Updated');
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 'user-1',
        full_name: 'Janet Updated',
        first_name: 'Janet',
        last_name: 'Updated',
        nickname: 'Janie',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
        metadata_entries: [],
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Member updated successfully.');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/members');
  });

  it('shows error toast when update fails', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error('update failed'));

    renderWithRouter();

    fireEvent.change(screen.getByLabelText('First Name *'), {
      target: { value: 'Janet' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('update failed');
    });
  });

  it('shows default error toast when update fails with non-Error value', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce('unknown failure');

    renderWithRouter();

    fireEvent.change(screen.getByLabelText('First Name *'), {
      target: { value: 'Janet' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to update member.');
    });
  });

  it('shows not found state when query returns no member data without query error', () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    renderWithRouter();

    expect(screen.getByText(/Member not found/i)).toBeInTheDocument();
  });

  it('renders pending save state as disabled Saving button', () => {
    mockUseUpdateMemberMutation.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: true,
    });

    renderWithRouter();

    const savingButton = screen.getByRole('button', { name: 'Saving...' });
    expect(savingButton).toBeDisabled();
  });

  it('keeps save disabled when form is dirty but mutation is pending', async () => {
    mockUseUpdateMemberMutation.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: true,
    });

    renderWithRouter();

    fireEvent.change(screen.getByLabelText('First Name *'), {
      target: { value: 'Janet' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });
  });

  it('normalizes nullable member fields into empty form values', async () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        is_active: true,
        full_name: 'Jane Doe',
        first_name: null,
        last_name: null,
        nickname: 'Janie',
        email: null,
        phone: null,
        date_of_birth: null,
        role: 'player',
        category: 'adult',
        extra_metadata: {},
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByLabelText('First Name *')).toHaveValue('');
      expect(screen.getByLabelText('Last Name *')).toHaveValue('');
      expect(screen.getByLabelText('Nickname *')).toHaveValue('Janie');
      expect(screen.getByLabelText('Email')).toHaveValue('');
      expect(screen.getByLabelText('Phone')).toHaveValue('');
      expect(screen.getByLabelText('Date of Birth')).toHaveValue('');
    });
  });

  it('opens delete dialog and soft deletes member', async () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ id: 'user-1' });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Member deleted successfully.');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/members');
  });

  it('shows error toast when soft delete fails', async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error('delete failed'));

    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('delete failed');
    });
  });

  it('shows default error toast when soft delete fails with non-Error value', async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce('unknown delete failure');

    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to delete member.');
    });
  });

  it('shows restore action and restores deleted member', async () => {
    const mockRefetch = vi.fn();
    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        is_active: false,
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: 'Janie',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
        extra_metadata: {},
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithRouter();

    expect(screen.getByRole('button', { name: 'Restore Member' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Member' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(mockRestoreMutateAsync).toHaveBeenCalledWith({ id: 'user-1' });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Member restored successfully.');
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows default error toast when restore fails with non-Error value', async () => {
    mockRestoreMutateAsync.mockRejectedValueOnce('unknown restore failure');

    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        is_active: false,
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: 'Janie',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
        extra_metadata: {},
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to restore member.');
    });
  });

  it('loads detail query with includeInactive enabled', () => {
    renderWithRouter();

    expect(mockUseAdminMemberQuery).toHaveBeenCalledWith('user-1', { includeInactive: true });
  });

  it('loads extra_metadata entries into the Additional Metadata section', async () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        is_active: true,
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: 'Janie',
        email: 'jane@example.com',
        phone: '',
        date_of_birth: '',
        role: 'player',
        category: 'adult',
        extra_metadata: { is_oic: 'true', first_sunday: 'yes' },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByDisplayValue('is_oic')).toBeInTheDocument();
      expect(screen.getByDisplayValue('true')).toBeInTheDocument();
      expect(screen.getByDisplayValue('first_sunday')).toBeInTheDocument();
      expect(screen.getByDisplayValue('yes')).toBeInTheDocument();
    });
  });

  it('renders member details as read-only for slod users', async () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'slod' },
      isLoading: false,
    });

    renderWithRouter();

    expect(screen.getByRole('heading', { name: 'View Member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Members' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore Member' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('First Name *')).toBeDisabled();
    expect(screen.getByLabelText('Role *')).toBeDisabled();
  });
});
