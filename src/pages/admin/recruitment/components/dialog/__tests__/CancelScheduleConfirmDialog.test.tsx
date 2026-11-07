import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CancelScheduleConfirmDialog,
  type CancelScheduleConfirmDialogProps,
} from '../CancelScheduleConfirmDialog';

describe('CancelScheduleConfirmDialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  const defaultProps: CancelScheduleConfirmDialogProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isPending: false,
    applicant: {
      name: 'Maria Santos (Tin)',
      email: 'maria@example.com',
      phone: '09171234567',
      avatarObjectKey: 'avatars/maria.png',
    },
    stepNumber: 2,
    stepTitle: 'Ministry Interview',
    scheduledAt: '2026-11-08T09:00',
    reviewerName: 'Aaron Atienza (Aey)',
  };

  it('renders applicant info, step title, scheduled session details, and warning notice', () => {
    renderWithClient(<CancelScheduleConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cancel Scheduled Session')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos (Tin)')).toBeInTheDocument();
    expect(screen.getByText(/maria@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/09171234567/i)).toBeInTheDocument();
    expect(screen.getByText('Ministry Interview Session')).toBeInTheDocument();
    expect(screen.getByText('To Be Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Aaron Atienza (Aey)')).toBeInTheDocument();
    expect(screen.getByText(/What happens when cancelled:/i)).toBeInTheDocument();
  });

  it('requires cancellation reason and disables confirm button when empty', async () => {
    const user = userEvent.setup();
    renderWithClient(<CancelScheduleConfirmDialog {...defaultProps} />);

    const confirmBtn = screen.getByRole('button', { name: /confirm & cancel schedule/i });
    expect(confirmBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/cancellation reason/i);
    await user.type(textarea, 'Candidate requested a different date');
    expect(confirmBtn).toBeEnabled();

    await user.clear(textarea);
    expect(confirmBtn).toBeDisabled();
  });

  it('triggers onConfirm with trimmed cancellation reason when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithClient(<CancelScheduleConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    const textarea = screen.getByLabelText(/cancellation reason/i);
    await user.type(textarea, 'Candidate is travelling out of town   ');

    const confirmBtn = screen.getByRole('button', { name: /confirm & cancel schedule/i });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('Candidate is travelling out of town');
  });

  it('triggers onClose when Keep Schedule button is clicked', () => {
    const onClose = vi.fn();
    renderWithClient(<CancelScheduleConfirmDialog {...defaultProps} onClose={onClose} />);

    const keepBtn = screen.getByRole('button', { name: /keep schedule/i });
    fireEvent.click(keepBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows spinner when isPending is true', () => {
    renderWithClient(<CancelScheduleConfirmDialog {...defaultProps} isPending={true} />);

    expect(screen.getByText('Cancelling...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep schedule/i })).toBeDisabled();
  });
});
