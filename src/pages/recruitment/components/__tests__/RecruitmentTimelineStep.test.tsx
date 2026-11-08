import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecruitmentTimelineStep } from '../RecruitmentTimelineStep';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

describe('RecruitmentTimelineStep', () => {
  it('renders step number, title, description, and status badge', () => {
    render(
      <RecruitmentTimelineStep
        description="Complete interview with a coach."
        isCurrent={false}
        status="pending"
        stepNumber={2}
        title="Interview"
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Interview' })).toBeInTheDocument();
    expect(screen.getByText('Complete interview with a coach.')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders a completed step with an accessible checkmark label and active path', () => {
    render(
      <RecruitmentTimelineStep
        description="Survey completed."
        isCurrent={false}
        isPathActive
        status="completed"
        stepNumber={1}
        title="Registration and Biblical Survey"
      />,
    );

    expect(screen.getByLabelText('Step 1 completed')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders scheduled appointment details with reviewer avatar and date', () => {
    render(
      <RecruitmentTimelineStep
        description="Meet with a reviewer."
        isCurrent
        status="scheduled"
        stepNumber={2}
        title="Interview"
        transaction={{
          step_number: 2,
          step_key: 'interview',
          attempt_number: 1,
          status: 'scheduled',
          transaction_type: 'scheduled',
          scheduled_at: '2026-11-15T09:00:00Z',
          assigned_reviewer_name: 'Aaron Atienza',
          applicant_visible_notes: null,
          completed_at: null,
          created_at: '2026-11-08T09:00:00Z',
        }}
      />,
    );

    expect(screen.getByLabelText('Step 2 in progress')).toBeInTheDocument();
    expect(screen.getByText(/Scheduled:/)).toBeInTheDocument();
    expect(screen.getByText('Aaron Atienza')).toBeInTheDocument();
  });

  it('does not render the vertical track line when isLast is true', () => {
    const { container } = render(
      <RecruitmentTimelineStep
        description="Final deployment."
        isCurrent={false}
        isLast
        status="locked"
        stepNumber={9}
        title="Deployment"
      />,
    );

    // Only the node icon container exists, no sibling connecting track
    const nodeColumn = container.querySelector('.flex.flex-col.items-center');
    expect(nodeColumn?.children).toHaveLength(1);
  });
});
