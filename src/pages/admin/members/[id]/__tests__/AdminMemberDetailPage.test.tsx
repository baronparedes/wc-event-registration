import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMemberDetailPage } from '../index';

const {
  mockUseAdminMemberQuery,
  mockUseUpdateMemberMutation,
  mockUseSoftDeleteMemberMutation,
  mockUseRestoreMemberMutation,
  mockUseUploadMemberAvatarMutation,
  mockUseAdminAuthQuery,
} = vi.hoisted(() => ({
  mockUseAdminMemberQuery: vi.fn(),
  mockUseUpdateMemberMutation: vi.fn(),
  mockUseSoftDeleteMemberMutation: vi.fn(),
  mockUseRestoreMemberMutation: vi.fn(),
  mockUseUploadMemberAvatarMutation: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMemberQuery: () => mockUseAdminMemberQuery(),
  useUpdateMemberMutation: () => mockUseUpdateMemberMutation(),
  useSoftDeleteMemberMutation: () => mockUseSoftDeleteMemberMutation(),
  useRestoreMemberMutation: () => mockUseRestoreMemberMutation(),
  useUploadMemberAvatarMutation: () => mockUseUploadMemberAvatarMutation(),
  useMemberAvatarQuery: () => ({ data: null }),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
  canAdminPerform: () => true,
}));

function renderPage(path = '/admin/members/m1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/members/:id" element={<AdminMemberDetailPage />} />
          <Route path="/admin/members" element={<div>Admin Members Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleMember = {
  id: 'm1',
  member_id: 'MEM-001',
  first_name: 'John',
  last_name: 'Doe',
  nickname: 'Johnny',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567',
  date_of_birth: '1990-01-01',
  role: 'Leader',
  category: 'Adult',
  is_active: true,
  extra_metadata: { wedding_date: '2020-01-01' },
};

describe('AdminMemberDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuthQuery.mockReturnValue({ data: { adminRole: 'super_admin' } });
    mockUseUpdateMemberMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseSoftDeleteMemberMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseRestoreMemberMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUploadMemberAvatarMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders loading state', () => {
    mockUseAdminMemberQuery.mockReturnValue({ data: null, isLoading: true });
    renderPage();
    expect(screen.getByText('Loading member...')).toBeInTheDocument();
  });

  it('renders not found state', () => {
    mockUseAdminMemberQuery.mockReturnValue({ data: null, isLoading: false, isError: true });
    renderPage();
    expect(screen.getByText('Member not found. Return to the members list.')).toBeInTheDocument();
  });

  it('renders member details in edit mode and handles form submission', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 'm1' });
    mockUseUpdateMemberMutation.mockReturnValue({ mutateAsync: mockUpdate, isPending: false });
    mockUseAdminMemberQuery.mockReturnValue({ data: sampleMember, isLoading: false });

    renderPage();

    expect(screen.getByText('Edit Member')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MEM-001')).toBeInTheDocument();

    const firstNameInput = screen.getByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Johnny' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveBtn);
  });

  it('handles member deletion and restoration', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ id: 'm1' });
    const mockRestore = vi.fn().mockResolvedValue({ id: 'm1' });
    mockUseSoftDeleteMemberMutation.mockReturnValue({ mutateAsync: mockDelete, isPending: false });
    mockUseRestoreMemberMutation.mockReturnValue({ mutateAsync: mockRestore, isPending: false });

    mockUseAdminMemberQuery.mockReturnValue({ data: sampleMember, isLoading: false });

    renderPage();

    const deleteBtn = screen.getByRole('button', { name: /Delete Member/i });
    fireEvent.click(deleteBtn);

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);
    expect(mockDelete).toHaveBeenCalledWith({ id: 'm1' });
  });

  it('renders soft deleted member banner', () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: { ...sampleMember, is_active: false },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText(/This member is soft deleted/)).toBeInTheDocument();
  });
});
