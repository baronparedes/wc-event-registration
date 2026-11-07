import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { RecruitmentPipelineTransaction } from '@/lib/domain/recruitment';

import { StepAttemptsHistoryDialog } from '../StepAttemptsHistoryDialog';

const mockAttempts: RecruitmentPipelineTransaction[] = [
  {
    id: 'tx-att-1',
    application_id: 'app-1',
    step_number: 4,
    step_key: 'observation',
    attempt_number: 1,
    transaction_type: 'repeated_step',
    status: 'completed',
    from_step: 4,
    to_step: 4,
    assigned_reviewer_id: 'coach-1',
    assigned_reviewer_name: 'Coach Sarah',
    scheduled_at: '2026-11-01T09:00:00+08:00',
    completed_at: '2026-11-01T11:00:00+08:00',
    rubric_data: {},
    notes: 'Candidate was quiet during the first observation. Needs another round.',
    applicant_visible_notes: null,
    created_by_user_id: 'user-1',
    created_at: '2026-11-01T11:00:00+08:00',
  },
  {
    id: 'tx-att-2',
    application_id: 'app-1',
    step_number: 4,
    step_key: 'observation',
    attempt_number: 2,
    transaction_type: 'repeated_step',
    status: 'completed',
    from_step: 4,
    to_step: 4,
    assigned_reviewer_id: 'coach-2',
    assigned_reviewer_name: 'Coach David',
    scheduled_at: '2026-11-08T09:00:00+08:00',
    completed_at: '2026-11-08T11:00:00+08:00',
    rubric_data: {},
    notes: 'Great improvement in welcoming guests.',
    applicant_visible_notes: null,
    created_by_user_id: 'user-1',
    created_at: '2026-11-08T11:00:00+08:00',
  },
];

describe('StepAttemptsHistoryDialog', () => {
  it('renders attempts history with details and notes intact', () => {
    const onClose = vi.fn();
    render(
      <StepAttemptsHistoryDialog
        isOpen={true}
        onClose={onClose}
        stepNumber={4}
        stepTitle="Observation"
        attempts={mockAttempts}
      />,
    );

    expect(screen.getByText('Previous Observation Attempts (2)')).toBeInTheDocument();
    expect(screen.getByText('Recorded History Intact')).toBeInTheDocument();
    expect(screen.getByText('Attempt #1')).toBeInTheDocument();
    expect(screen.getByText('Coach Sarah')).toBeInTheDocument();
    expect(
      screen.getByText('Candidate was quiet during the first observation. Needs another round.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Attempt #2')).toBeInTheDocument();
    expect(screen.getByText('Coach David')).toBeInTheDocument();
    expect(screen.getByText('Great improvement in welcoming guests.')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <StepAttemptsHistoryDialog
        isOpen={true}
        onClose={onClose}
        stepNumber={2}
        stepTitle="Interview"
        attempts={mockAttempts}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: /^close$/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
