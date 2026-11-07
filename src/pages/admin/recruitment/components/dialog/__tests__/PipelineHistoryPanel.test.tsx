import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type {
  RecruitmentApplication,
  RecruitmentPipelineTransaction,
} from '@/lib/domain/recruitment';

import { PipelineHistoryPanel } from '../PipelineHistoryPanel';

const mockApplication: RecruitmentApplication = {
  id: 'app-1',
  auth_user_id: null,
  email: 'test@example.com',
  first_name: 'Test Timothy',
  middle_name: null,
  last_name: 'Test Paul',
  full_name: 'Test Timothy Paul',
  nickname: 'Test Tim',
  phone: '09171234567',
  date_of_birth: '1995-05-15',
  gender: 'Male',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: 'Usher',
  personal_details: { occupation: 'Designer', company_name: null, wedding_anniversary: null },
  emergency_contact: { name: 'Test Mary Paul', phone: '09181234567', relation: 'Mother' },
  application_history: { is_first_time_applicant: true, previous_application_notes: null },
  spiritual_background: {
    ccf_member_since: '2020 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'None',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2019 Jan',
    leader_name: 'Test Barnabas Leader',
    leader_email: 'barnabas@example.com',
    leader_phone: '09191234567',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  applicant_attested_at: '2026-11-01T08:00:00+08:00',
  survey_answers: {},
  survey_score: 20,
  survey_total: 20,
  current_step: 3,
  status: 'active',
  dgroup_approval_id: null,
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: {},
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-11-01T08:00:00+08:00',
  updated_at: '2026-11-01T08:00:00+08:00',
};

const mockTransactions: RecruitmentPipelineTransaction[] = [
  {
    id: 'tx-1',
    application_id: 'app-1',
    step_number: 1,
    step_key: 'register',
    attempt_number: 1,
    transaction_type: 'completed',
    from_step: 1,
    to_step: 2,
    status: 'completed',
    assigned_reviewer_id: null,
    assigned_reviewer_name: null,
    scheduled_at: null,
    completed_at: '2026-11-01T09:00:00+08:00',
    rubric_data: {},
    notes: null,
    applicant_visible_notes: null,
    created_by_user_id: null,
    created_at: '2026-11-01T09:00:00+08:00',
  },
  {
    id: 'tx-2',
    application_id: 'app-1',
    step_number: 2,
    step_key: 'interview',
    attempt_number: 1,
    transaction_type: 'scheduled',
    from_step: 2,
    to_step: 2,
    status: 'scheduled',
    assigned_reviewer_id: 'user-1',
    assigned_reviewer_name: 'Test Coach Peter',
    scheduled_at: '2026-11-08T10:00:00+08:00',
    completed_at: null,
    rubric_data: {},
    notes: 'Please bring personal Bible.',
    applicant_visible_notes: 'Meet at Welcome Center Room 2.',
    created_by_user_id: 'user-1',
    created_at: '2026-11-02T10:00:00+08:00',
  },
];

describe('PipelineHistoryPanel', () => {
  it('renders all transactions and filters by step', async () => {
    const user = userEvent.setup();
    render(<PipelineHistoryPanel application={mockApplication} transactions={mockTransactions} />);

    expect(screen.getByText('Pipeline Transaction History')).toBeInTheDocument();
    expect(screen.getByText('2 Total Records')).toBeInTheDocument();

    expect(screen.getByText(/Step 1: Register — Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2: Interview — Session Scheduled/i)).toBeInTheDocument();
    expect(screen.getByText('Test Coach Peter')).toBeInTheDocument();
    expect(screen.getByText('Please bring personal Bible.')).toBeInTheDocument();
    expect(screen.queryByText('Meet at Welcome Center Room 2.')).not.toBeInTheDocument();

    // Filter to Step 1 only
    const step1Btn = screen.getByRole('button', { name: /Step 1 \(1\)/i });
    await user.click(step1Btn);

    expect(screen.getByText(/Step 1: Register — Completed/i)).toBeInTheDocument();
    expect(screen.queryByText(/Step 2: Interview — Session Scheduled/i)).not.toBeInTheDocument();

    // Reset to All Steps
    const allStepsBtn = screen.getByRole('button', { name: /All Steps \(2\)/i });
    await user.click(allStepsBtn);

    expect(screen.getByText(/Step 2: Interview — Session Scheduled/i)).toBeInTheDocument();
  });

  it('renders empty state when no transactions exist', () => {
    render(<PipelineHistoryPanel application={mockApplication} transactions={[]} />);

    expect(screen.getByText(/No transaction records found/i)).toBeInTheDocument();
  });

  it('sorts transactions by newest first by default and toggles to oldest first', async () => {
    const user = userEvent.setup();
    render(<PipelineHistoryPanel application={mockApplication} transactions={mockTransactions} />);

    // Default is Newest First: tx-2 (Nov 8 scheduled / Nov 2 created) before tx-1 (Nov 1)
    const titlesDefault = screen.getAllByText(/Step \d: /i);
    expect(titlesDefault[0]).toHaveTextContent('Step 2: Interview — Session Scheduled');
    expect(titlesDefault[1]).toHaveTextContent('Step 1: Register — Completed');

    // Toggle to Oldest First
    const oldestToggle = screen.getByRole('button', { name: /oldest first/i });
    await user.click(oldestToggle);

    const titlesOldest = screen.getAllByText(/Step \d: /i);
    expect(titlesOldest[0]).toHaveTextContent('Step 1: Register — Completed');
    expect(titlesOldest[1]).toHaveTextContent('Step 2: Interview — Session Scheduled');

    // Toggle back to Newest First
    const newestToggle = screen.getByRole('button', { name: /newest first/i });
    await user.click(newestToggle);

    const titlesNewest = screen.getAllByText(/Step \d: /i);
    expect(titlesNewest[0]).toHaveTextContent('Step 2: Interview — Session Scheduled');
    expect(titlesNewest[1]).toHaveTextContent('Step 1: Register — Completed');
  });
});
