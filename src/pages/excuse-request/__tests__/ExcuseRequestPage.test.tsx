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

vi.mock('react-day-picker', () => ({
  DayPicker: ({ onSelect }: { onSelect?: (date?: Date) => void }) => (
    <div data-testid="mock-day-picker">
      <button
        type="button"
        onClick={() => onSelect?.(new Date(2026, 9, 25))} // Oct 25, 2026 is Sunday
      >
        Pick Sunday Oct 25
      </button>
    </div>
  ),
}));

vi.mock('react-day-picker/style.css', () => ({}));

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
    // Initially nothing is selected
    expect(screen.getByText('Select Sunday date')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /9:00 AM/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('checkbox', { name: /12:00 NN/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('checkbox', { name: /3:00 PM/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
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

  it('displays inline form errors when submitting without selecting date or service slots', async () => {
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

    // Advance to Step 3
    const confirmButton = await screen.findByRole('button', { name: 'Yes, I confirm' });
    fireEvent.click(confirmButton);

    // Click submit without selecting date or services
    fireEvent.click(screen.getByRole('button', { name: 'Submit Excuse Request' }));

    // Inline form validation errors must be displayed
    expect(await screen.findByText(/Please select a Sunday service date/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select at least one service slot/i)).toBeInTheDocument();
    expect(screen.getByText(/Please provide a reason for your absence/i)).toBeInTheDocument();
    // No toast error
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockMutateSubmit).not.toHaveBeenCalled();
  });

  it('submits excuse request in Step 3 and renders success confirmation screen without toast errors', async () => {
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

    // Select date from SundayCalendarPicker
    const datePickerButton = screen.getByLabelText(/Sunday Service Date/i);
    fireEvent.click(datePickerButton);
    const pickDateButton = await screen.findByRole('button', { name: /Pick Sunday Oct 25/i });
    fireEvent.click(pickDateButton);

    // Select 12:00 NN service slot
    const slot12nn = screen.getByRole('checkbox', { name: /12:00 NN/i });
    fireEvent.click(slot12nn);
    expect(slot12nn).toHaveAttribute('aria-checked', 'true');

    // Fill reason
    const reasonInput = screen.getByLabelText(/Reason for Absence/i);
    fireEvent.change(reasonInput, { target: { value: 'Work conference' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Submit Excuse Request' }));

    await waitFor(() => {
      expect(mockMutateSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'c81373ea-9878-43d9-95cb-64a0e98032f2',
          member_id: 'MEM-1001',
          request_date: '2026-10-25',
          services: ['12NN'],
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
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('displays inline AlertBanner on submission error without toast error', async () => {
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
    mockMutateSubmit.mockRejectedValueOnce(new Error('Network error submitting excuse'));

    renderPage();

    // Advance to Step 3
    const confirmButton = await screen.findByRole('button', { name: 'Yes, I confirm' });
    fireEvent.click(confirmButton);

    // Select date
    const datePickerButton = screen.getByLabelText(/Sunday Service Date/i);
    fireEvent.click(datePickerButton);
    fireEvent.click(await screen.findByRole('button', { name: /Pick Sunday Oct 25/i }));

    // Select service
    fireEvent.click(screen.getByRole('checkbox', { name: /9:00 AM/i }));

    // Fill reason
    fireEvent.change(screen.getByLabelText(/Reason for Absence/i), {
      target: { value: 'Feeling unwell' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Submit Excuse Request' }));

    // Error banner inside the form is shown
    expect(await screen.findByText('Network error submitting excuse')).toBeInTheDocument();
    // No toast error
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
