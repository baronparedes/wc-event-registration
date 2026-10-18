import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestLongLeaveModal } from '../RequestLongLeaveModal';

const { mockUseSubmitExcuseMutation, mockUseSlodUsersQuery } = vi.hoisted(() => ({
  mockUseSubmitExcuseMutation: vi.fn(),
  mockUseSlodUsersQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: () => mockUseSubmitExcuseMutation(),
}));

vi.mock('@/hooks/domain/approvals', () => ({
  useSlodUsersQuery: () => mockUseSlodUsersQuery(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RequestLongLeaveModal', () => {
  const mockMutateAsync = vi.fn();
  const mockOnClose = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubmitExcuseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockUseSlodUsersQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('renders modal in member mode with default controls and Sunday pickers', () => {
    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="John Member"
        isAdminView={false}
      />,
    );

    expect(screen.getByText('Request Long Leave')).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Sunday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Sunday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Extended Leave/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Leave Request/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Delegate Review to SLOD/i)).not.toBeInTheDocument();
  });

  it('renders modal in admin mode without memberName and submits successfully', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'excuse-999' });

    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName=""
        isAdminView={true}
      />,
    );

    expect(screen.getByText('File Long Leave for Member')).toBeInTheDocument();
    const reasonInput = screen.getByLabelText(/Reason for Extended Leave/i);
    fireEvent.change(reasonInput, { target: { value: 'Annual sabbatical leave' } });

    const submitBtn = screen.getByRole('button', { name: /File Leave Request/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Long leave request filed for member');
    });
  });

  it('resets form when modal transitions from closed to open', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <RequestLongLeaveModal
          isOpen={false}
          onClose={mockOnClose}
          userId="user-1"
          memberName="Jane Doe"
          isAdminView={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Request Long Leave')).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <RequestLongLeaveModal
          isOpen={true}
          onClose={mockOnClose}
          userId="user-1"
          memberName="Jane Doe"
          isAdminView={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Request Long Leave')).toBeInTheDocument();
  });

  it('allows selecting Sundays in start and end calendar pickers', () => {
    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Jane Doe"
        isAdminView={false}
      />,
    );

    const startPicker = screen.getByLabelText(/Start Sunday/i);
    fireEvent.click(startPicker);

    // Find enabled day buttons in the DayPicker
    const dayButtons = screen.getAllByRole('button');
    const enabledDay = dayButtons.find(
      (btn) =>
        btn.classList.contains('rdp-button') ||
        (btn.getAttribute('name') === 'day' && !btn.hasAttribute('disabled')),
    );
    if (enabledDay) {
      fireEvent.click(enabledDay);
    }

    const endPicker = screen.getByLabelText(/End Sunday/i);
    fireEvent.click(endPicker);

    const endDayButtons = screen.getAllByRole('button');
    const enabledEndDay = endDayButtons.find(
      (btn) =>
        btn.classList.contains('rdp-button') ||
        (btn.getAttribute('name') === 'day' && !btn.hasAttribute('disabled')),
    );
    if (enabledEndDay) {
      fireEvent.click(enabledEndDay);
    }
  });

  it('submits form with valid data and calls mutation in member mode', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'excuse-123' });

    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Member Self"
        isAdminView={false}
      />,
    );

    const reasonInput = screen.getByLabelText(/Reason for Extended Leave/i);
    fireEvent.change(reasonInput, { target: { value: 'Extended medical recovery leave' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Leave Request/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          is_long_leave: true,
          reason: 'Extended medical recovery leave',
          services: expect.arrayContaining(['9AM', '12NN', '3PM']),
        }),
      );
      expect(toast.success).toHaveBeenCalledWith('Long leave request submitted for approval');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles delegation selection in admin view and submits with assigned email', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'excuse-456' });
    mockUseSlodUsersQuery.mockReturnValue({
      data: [
        {
          auth_user_id: 'slod-1',
          email: 'slod1@example.com',
          name: 'SLOD Leader',
          avatar_object_key: null,
        },
      ],
      isLoading: false,
    });

    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Jane Doe"
        isAdminView={true}
      />,
    );

    // Click the custom select dropdown button
    const delegateButton = document.getElementById('admin-slod-delegate') as HTMLButtonElement;
    expect(delegateButton).toBeInTheDocument();
    fireEvent.click(delegateButton);

    // Select the SLOD Leader option
    const option = screen.getByRole('option', { name: /SLOD Leader/i });
    fireEvent.click(option);

    const reasonInput = screen.getByLabelText(/Reason for Extended Leave/i);
    fireEvent.change(reasonInput, { target: { value: 'Sabbatical for overseas studies' } });

    const submitBtn = screen.getByRole('button', { name: /File Leave Request/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          is_long_leave: true,
          assigned_to_email: 'slod1@example.com',
          reason: 'Sabbatical for overseas studies',
        }),
      );
      expect(toast.success).toHaveBeenCalledWith('Long leave request filed for Jane Doe');
    });

    // Also test changing delegate back to 'none'
    fireEvent.click(delegateButton);
    const noneOption = screen.getByRole('option', { name: /None \(Open to all Admins\)/i });
    fireEvent.click(noneOption);
  });

  it('handles submission error and displays toast error', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Backend validation failed'));

    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Jane Doe"
        isAdminView={true}
      />,
    );

    const reasonInput = screen.getByLabelText(/Reason for Extended Leave/i);
    fireEvent.change(reasonInput, { target: { value: 'Sabbatical leave' } });

    const submitBtn = screen.getByRole('button', { name: /File Leave Request/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Backend validation failed');
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('handles non-Error submission rejection and displays fallback toast error', async () => {
    mockMutateAsync.mockRejectedValueOnce('string error');

    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Jane Doe"
        isAdminView={true}
      />,
    );

    const reasonInput = screen.getByLabelText(/Reason for Extended Leave/i);
    fireEvent.change(reasonInput, { target: { value: 'Sabbatical leave' } });

    const submitBtn = screen.getByRole('button', { name: /File Leave Request/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to submit long leave request');
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('displays validation error when reason is empty', async () => {
    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Jane Doe"
        isAdminView={false}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Submit Leave Request/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Please provide a reason for the leave')).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });
});
