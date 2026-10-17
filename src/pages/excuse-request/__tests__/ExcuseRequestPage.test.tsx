import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExcuseRequestPage } from '../index';

const {
  mockUseAdminAuthQuery,
  mockUseCurrentProfileQuery,
  mockUseMemberLookupQuery,
  mockUseSubmitExcuseMutation,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseAdminAuthQuery: vi.fn(),
  mockUseCurrentProfileQuery: vi.fn(),
  mockUseMemberLookupQuery: vi.fn(),
  mockUseSubmitExcuseMutation: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));

vi.mock('@/hooks/domain/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/domain/members')>();
  return {
    ...actual,
    useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
    useMemberLookupQuery: () => mockUseMemberLookupQuery(),
    useMemberAvatarQuery: () => ({ data: null }),
  };
});

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: () => mockUseSubmitExcuseMutation(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('ExcuseRequestPage', () => {
  const mockMutateLookup = vi.fn();
  const mockMutateSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuthQuery.mockReturnValue({ data: null, isLoading: false });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null, isLoading: false });
    mockUseMemberLookupQuery.mockReturnValue({
      mutateAsync: mockMutateLookup,
      isPending: false,
    });
    mockUseSubmitExcuseMutation.mockReturnValue({
      mutateAsync: mockMutateSubmit,
      isPending: false,
    });
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ExcuseRequestPage />
      </MemoryRouter>,
    );
  }

  it('renders public lookup form when user is not signed in', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Volunteer Excuse Request' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter Member ID or Scan RFID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    // Step 2 details form is not shown until volunteer is verified
    expect(screen.queryByLabelText(/Sunday Service Date/i)).not.toBeInTheDocument();
  });

  it('performs member lookup and reveals excuse form when verified', async () => {
    mockMutateLookup.mockResolvedValueOnce({
      profile: {
        member_token: 'mlt2.mock.token',
        full_name: 'Test Volunteer',
        first_name: 'Test',
        last_initial: 'V',
        role: 'Usher',
      },
    });

    renderPage();

    const input = screen.getByLabelText(/Enter Member ID or Scan RFID/i);
    fireEvent.change(input, { target: { value: 'MEM-2002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => {
      expect(mockMutateLookup).toHaveBeenCalledWith({ memberId: 'MEM-2002' });
    });

    expect(await screen.findByText('Test V')).toBeInTheDocument();
    expect(screen.getByText(/MEM-2002/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sunday Service Date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Excuse Request' })).toBeInTheDocument();
  });

  it('shows error message if member is not found', async () => {
    mockMutateLookup.mockResolvedValueOnce({ profile: null });

    renderPage();

    const input = screen.getByLabelText(/Enter Member ID or Scan RFID/i);
    fireEvent.change(input, { target: { value: 'UNKNOWN-ID' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText(/No active member found matching this ID/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Sunday Service Date/i)).not.toBeInTheDocument();
  });

  it('auto-detects signed-in member and renders excuse form directly', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { session: { user: { id: 'auth-user-1' } } },
      isLoading: false,
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: {
        id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
        member_id: 'MEM-1001',
        full_name: 'Test Member',
        role: 'Prayer Coach',
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Test Member')).toBeInTheDocument();
    expect(screen.getByText('MEM-1001')).toBeInTheDocument();
    expect(screen.getByText('Signed In')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sunday Service Date/i)).toBeInTheDocument();
  });

  it('submits excuse request and renders success confirmation', async () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { session: { user: { id: 'auth-user-1' } } },
      isLoading: false,
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: {
        id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
        member_id: 'MEM-1001',
        full_name: 'Test Member',
        role: 'Prayer Coach',
      },
      isLoading: false,
    });
    mockMutateSubmit.mockResolvedValueOnce({ id: 'excuse-123' });

    renderPage();

    // Toggle 9:00 AM service
    fireEvent.click(screen.getByRole('button', { name: /9:00 AM/i }));

    // Fill reason
    const reasonInput = screen.getByLabelText(/Reason \/ Notes/i);
    fireEvent.change(reasonInput, { target: { value: 'Work conference' } });

    // Submit form
    const form = screen.getByRole('button', { name: 'Submit Excuse Request' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
          member_id: 'MEM-1001',
          services: ['9AM'],
          reason: 'Work conference',
        }),
      );
    });

    expect(
      await screen.findByRole('heading', { name: 'Excuse Request Submitted' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/"Work conference"/)).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith('Excuse request submitted successfully');
  });
});
