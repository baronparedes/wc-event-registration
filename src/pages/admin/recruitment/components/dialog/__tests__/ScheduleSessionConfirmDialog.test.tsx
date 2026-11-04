import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ScheduleSessionConfirmDialog,
  type ScheduleSessionConfirmDialogProps,
} from '../ScheduleSessionConfirmDialog';

describe('ScheduleSessionConfirmDialog', () => {
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
  const defaultProps: ScheduleSessionConfirmDialogProps = {
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
    stepTitle: 'Step 2: Interview',
    actionKind: 'schedule',
    scheduledAt: '2026-11-08T09:00',
    reviewer: {
      id: 'rev-1',
      name: 'Aaron Atienza (Aey)',
      role: 'OIC',
    },
    assignedRole: 'Prayer Coach',
    recruitmentNotes: 'Strong leadership and active in CCF for 5 years.',
    applicantInstructions: 'Please arrive 15 minutes before the 9:00 AM session.',
  };

  it('renders applicant info, step title, formatted session date & time, reviewer, and assigned role', () => {
    renderWithClient(<ScheduleSessionConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Session Schedule')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos (Tin)')).toBeInTheDocument();
    expect(screen.getByText(/maria@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/09171234567/i)).toBeInTheDocument();
    expect(screen.getByText('Step 2: Interview')).toBeInTheDocument();
    expect(screen.getByText(/Sun, Nov 8, 2026 · 9:00 AM/i)).toBeInTheDocument();
    expect(screen.getByText('Aaron Atienza (Aey)')).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
  });

  it('renders recruitment notes and applicant instructions previews', () => {
    renderWithClient(<ScheduleSessionConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Applicant-Visible Instructions')).toBeInTheDocument();
    expect(
      screen.getByText('Please arrive 15 minutes before the 9:00 AM session.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Recruitment Notes')).toBeInTheDocument();
    expect(
      screen.getByText('Strong leadership and active in CCF for 5 years.'),
    ).toBeInTheDocument();
  });

  it('handles reschedule action kind with proper title and button text', () => {
    renderWithClient(<ScheduleSessionConfirmDialog {...defaultProps} actionKind="reschedule" />);

    expect(screen.getByText('Confirm Session Reschedule')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm & reschedule/i })).toBeInTheDocument();
  });

  it('handles repeat_step action kind with re-interview title and button text', () => {
    renderWithClient(
      <ScheduleSessionConfirmDialog {...defaultProps} actionKind="repeat_step" stepNumber={2} />,
    );

    expect(screen.getByText('Confirm Re-Interview Schedule')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm & schedule re-interview/i }),
    ).toBeInTheDocument();
  });

  it('handles return_to_interview action kind', () => {
    renderWithClient(
      <ScheduleSessionConfirmDialog
        {...defaultProps}
        actionKind="return_to_interview"
        stepNumber={3}
      />,
    );

    expect(screen.getByText('Confirm Return to Interview Schedule')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm & return to interview/i }),
    ).toBeInTheDocument();
  });

  it('triggers onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    renderWithClient(<ScheduleSessionConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm & schedule/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderWithClient(<ScheduleSessionConfirmDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows spinner when isPending is true', () => {
    renderWithClient(<ScheduleSessionConfirmDialog {...defaultProps} isPending={true} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const confirmBtn = screen.getByRole('button', { name: /scheduling\.\.\./i });

    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();
  });
});
