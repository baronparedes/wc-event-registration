import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
        isAdminView={false}
      />,
    );

    expect(screen.getByText('Request Long Leave')).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Sunday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Sunday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Extended Leave/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Leave Request/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Delegate Review to SLOD/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Reviewer Email/i)).not.toBeInTheDocument();
  });

  it('renders modal in admin mode with target member name and SLOD selector', () => {
    mockUseSlodUsersQuery.mockReturnValue({
      data: [
        {
          auth_user_id: 'slod-1',
          email: 'slod1@example.com',
          name: 'SLOD Leader One',
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

    expect(screen.getByText('File Long Leave for Jane Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /File Leave Request/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Delegate Review to SLOD/i)).toBeInTheDocument();
  });

  it('opens calendar popover dialog when Sunday picker trigger is clicked', () => {
    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        isAdminView={false}
      />,
    );

    const startPicker = screen.getByLabelText(/Start Sunday/i);
    fireEvent.click(startPicker);

    expect(
      screen.getByText('Only upcoming Sunday service dates can be selected'),
    ).toBeInTheDocument();
  });

  it('submits form with valid data and calls mutation', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'excuse-123' });

    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        memberName="Jane Doe"
        isAdminView={true}
      />,
    );

    // Type reason
    const reasonInput = screen.getByLabelText(/Reason for Extended Leave/i);
    fireEvent.change(reasonInput, { target: { value: 'Sabbatical for overseas studies' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /File Leave Request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          is_long_leave: true,
          reason: 'Sabbatical for overseas studies',
          services: expect.arrayContaining(['9AM', '12NN', '3PM']),
        }),
      );
      expect(toast.success).toHaveBeenCalledWith('Long leave request filed for Jane Doe');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
