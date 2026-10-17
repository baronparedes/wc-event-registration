import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

vi.mock('@/hooks/domain/members/queries/useMemberLookupQuery', () => ({
  useMemberLookupQuery: () => mockUseMemberLookupQuery(),
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

describe('ExcuseRequestPage Wizard', () => {
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
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ExcuseRequestPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders Step 1 method selector when user is not signed in', () => {
    renderPage();

    expect(screen.getByText('Volunteer Excuse Request')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Find Your Profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scan via RFID reader/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search by my name/i })).toBeInTheDocument();
    // Step 2 & 3 not shown initially
    expect(screen.queryByText('Step 2: Confirm Your Details')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Sunday Service Date/i)).not.toBeInTheDocument();
  });

  it('performs member lookup via RFID/ID, advances to Step 2, and proceeds to Step 3', async () => {
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

    // Select RFID/ID method
    fireEvent.click(screen.getByRole('button', { name: /Scan via RFID reader/i }));

    const input = screen.getByPlaceholderText(/Scan or enter your Member ID/i);
    fireEvent.change(input, { target: { value: 'MEM-2002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(mockMutateLookup).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'MEM-2002' }),
      );
    });

    // Step 2: Confirm Profile
    expect(await screen.findByText('Step 2: Confirm Your Details')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, I confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan Another Member' })).toBeInTheDocument();

    // Proceed to Step 3: Excuse Details
    fireEvent.click(screen.getByRole('button', { name: 'Yes, I confirm' }));

    expect(await screen.findByText('Step 3: Excuse Details')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sunday Service Date/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /9:00 AM/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /12:00 NN/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /3:00 PM/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Excuse Request' })).toBeInTheDocument();
  });

  it('shows error message if member is not found in Step 1', async () => {
    mockMutateLookup.mockResolvedValueOnce({ profile: null });

    renderPage();

    // Select RFID/ID method
    fireEvent.click(screen.getByRole('button', { name: /Scan via RFID reader/i }));

    const input = screen.getByPlaceholderText(/Scan or enter your Member ID/i);
    fireEvent.change(input, { target: { value: 'UNKNOWN-ID' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/could not verify that entry/i)).toBeInTheDocument();
    expect(screen.queryByText('Step 2: Confirm Your Details')).not.toBeInTheDocument();
  });

  it('auto-detects signed-in member and advances to Step 2 for confirmation', async () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: {
        id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
        member_id: 'MEM-1001',
        full_name: 'Test Member',
        role: 'Prayer Coach',
      },
      isLoading: false,
    });
    mockMutateLookup.mockResolvedValueOnce({
      profile: {
        member_token: 'mlt2.mock.token',
        full_name: 'Test Member',
        first_name: 'Test',
        last_initial: 'M',
        role: 'Prayer Coach',
      },
    });

    renderPage();

    // Auto-advances to Step 2
    expect(await screen.findByText('Step 2: Confirm Your Details')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, I confirm' })).toBeInTheDocument();

    // Confirm and advance to Step 3
    fireEvent.click(screen.getByRole('button', { name: 'Yes, I confirm' }));
    expect(await screen.findByText('Step 3: Excuse Details')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sunday Service Date/i)).toBeInTheDocument();
  });

  it('submits excuse request in Step 3 and renders success confirmation screen', async () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: {
        id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
        member_id: 'MEM-1001',
        full_name: 'Test Member',
        role: 'Prayer Coach',
      },
      isLoading: false,
    });
    mockMutateLookup.mockResolvedValueOnce({
      profile: {
        member_token: 'mlt2.mock.token',
        full_name: 'Test Member',
        first_name: 'Test',
        last_initial: 'M',
        role: 'Prayer Coach',
      },
    });
    mockMutateSubmit.mockResolvedValueOnce({ id: 'excuse-123' });

    renderPage();

    // Advance from Step 2 to Step 3
    const confirmButton = await screen.findByRole('button', { name: 'Yes, I confirm' });
    fireEvent.click(confirmButton);

    // Toggle 12:00 NN service slot
    const slot12nn = await screen.findByRole('checkbox', { name: /12:00 NN/i });
    fireEvent.click(slot12nn);

    // Fill reason
    const reasonInput = screen.getByLabelText(/Reason \/ Notes/i);
    fireEvent.change(reasonInput, { target: { value: 'Work conference' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Submit Excuse Request' }));

    await waitFor(() => {
      expect(mockMutateSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
          member_id: 'MEM-1001',
          services: expect.arrayContaining(['9AM', '12NN']),
          reason: 'Work conference',
        }),
      );
    });

    expect(
      await screen.findByRole('heading', { name: 'Excuse Request Submitted!' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/"Work conference"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Another Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith('Excuse request submitted successfully');
  });
});
