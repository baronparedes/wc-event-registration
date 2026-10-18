import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestLongLeaveModal } from '../RequestLongLeaveModal';

const { mockUseSubmitExcuseMutation } = vi.hoisted(() => ({
  mockUseSubmitExcuseMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: () => mockUseSubmitExcuseMutation(),
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
  });

  it('renders modal in member mode with default controls', () => {
    renderWithClient(
      <RequestLongLeaveModal
        isOpen={true}
        onClose={mockOnClose}
        userId="user-1"
        isAdminView={false}
      />,
    );

    expect(screen.getByText('Request Long Leave')).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for Extended Leave/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Leave Request/i })).toBeInTheDocument();
  });

  it('renders modal in admin mode with target member name', () => {
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
