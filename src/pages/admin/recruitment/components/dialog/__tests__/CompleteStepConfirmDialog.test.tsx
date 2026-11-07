import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CompleteStepConfirmDialog,
  type CompleteStepConfirmDialogProps,
} from '../CompleteStepConfirmDialog';

describe('CompleteStepConfirmDialog', () => {
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

  const defaultProps: CompleteStepConfirmDialogProps = {
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
    currentStepTitle: 'Ministry Interview',
    nextStepTitle: 'Orientation',
    completedAt: '2026-11-08T09:00',
    reviewer: {
      id: 'rev-1',
      name: 'Aaron Atienza (Aey)',
      role: 'OIC',
    },
    assignedRole: 'Prayer Coach',
    recruitmentNotes: 'Passed interview with excellent feedback.',
  };

  it('renders applicant profile, progression banner, and Step 2 details', () => {
    renderWithClient(<CompleteStepConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Step 2 Completion')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos (Tin)')).toBeInTheDocument();
    expect(screen.getByText(/maria@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/09171234567/i)).toBeInTheDocument();

    // Progression flow
    expect(screen.getByText('Ministry Interview')).toBeInTheDocument();
    expect(screen.getByText('Next: Step 3')).toBeInTheDocument();
    expect(screen.getByText('Orientation')).toBeInTheDocument();

    // Details card
    expect(screen.getByText('Aaron Atienza (Aey)')).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(
      screen.getAllByText('Passed interview with excellent feedback.').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders Step 7 VMT ID and Registration Date', () => {
    renderWithClient(
      <CompleteStepConfirmDialog
        {...defaultProps}
        stepNumber={7}
        currentStepTitle="CCF VMT Registration"
        nextStepTitle="RFID and Service Commitments"
        ccfVmtId="VMT-98765"
        ccfVmtDate="2026-11-05"
      />,
    );

    expect(screen.getByText('Confirm Step 7 Completion')).toBeInTheDocument();
    expect(screen.getByText('VMT-98765')).toBeInTheDocument();
    expect(screen.getByText('2026-11-05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm & complete step 7/i })).toBeInTheDocument();
  });

  it('renders Step 8 Assigned RFID Tag and committed Sunday schedule', () => {
    renderWithClient(
      <CompleteStepConfirmDialog
        {...defaultProps}
        stepNumber={8}
        currentStepTitle="RFID and Service Commitments"
        nextStepTitle="Final Deployment"
        rfidTag="RFID-2026-1122"
        serviceCommitments={{
          first_sunday: ['9AM', '12NN'],
          second_sunday: ['9AM'],
          third_sunday: [],
          fourth_sunday: ['3PM'],
          fifth_sunday: [],
        }}
      />,
    );

    expect(screen.getByText('Confirm Step 8 Completion')).toBeInTheDocument();
    expect(screen.getByText('RFID-2026-1122')).toBeInTheDocument();
    expect(screen.getByText('Committed Sunday Schedule')).toBeInTheDocument();
    expect(screen.getByText('9AM, 12NN')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm & complete step 8/i })).toBeInTheDocument();
  });

  it('renders Step 9 Deployment confirmation with warning notice and committed schedule', () => {
    renderWithClient(
      <CompleteStepConfirmDialog
        {...defaultProps}
        stepNumber={9}
        currentStepTitle="Final Deployment"
        isDeployAction={true}
        assignedRole="Usher"
        rfidTag="RFID-2026-1122"
        serviceCommitments={{
          first_sunday: ['9AM'],
          second_sunday: [],
          third_sunday: ['12NN'],
          fourth_sunday: [],
          fifth_sunday: [],
        }}
      />,
    );

    expect(screen.getByText('Confirm Volunteer Deployment')).toBeInTheDocument();
    expect(screen.getByText('Welcome Center Volunteer')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('RFID-2026-1122')).toBeInTheDocument();
    expect(screen.getByText('Committed Sunday Schedule')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();
    expect(
      screen.getByText(/confirming deployment will complete the recruitment pipeline/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm & deploy volunteer/i })).toBeInTheDocument();
  });

  it('triggers onConfirm with completion notes when confirmation button is clicked', () => {
    const onConfirm = vi.fn();
    renderWithClient(<CompleteStepConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm & complete step 2/i }));
    expect(onConfirm).toHaveBeenCalledWith('Passed interview with excellent feedback.');
  });

  it('requires completion comment and disables confirm button when empty', () => {
    const onConfirm = vi.fn();
    renderWithClient(
      <CompleteStepConfirmDialog
        {...defaultProps}
        recruitmentNotes={undefined}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /confirm & complete step 2/i });
    expect(confirmBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/enter internal feedback/i);
    fireEvent.change(textarea, { target: { value: 'Great candidate, approved for orientation.' } });

    expect(confirmBtn).toBeEnabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith('Great candidate, approved for orientation.');
  });

  it('triggers onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderWithClient(<CompleteStepConfirmDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows spinner when isPending is true', () => {
    renderWithClient(<CompleteStepConfirmDialog {...defaultProps} isPending={true} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const confirmBtn = screen.getByRole('button', { name: /completing step\.\.\./i });

    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();
  });
});
