import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type {
  RecruitmentApplication,
  RecruitmentPipelineTransaction,
} from '@/lib/domain/recruitment';

export const mockApplication: RecruitmentApplication = {
  id: 'app-123',
  auth_user_id: null,
  email: 'applicant@example.com',
  first_name: 'Test Timothy',
  middle_name: null,
  last_name: 'Test Paul',
  full_name: 'Test Timothy Paul',
  nickname: 'Test Tim',
  phone: '09179998888',
  date_of_birth: '1998-08-10',
  gender: 'Male',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: 'Usher',
  personal_details: {
    occupation: 'Teacher',
    company_name: 'School',
    wedding_anniversary: null,
  },
  emergency_contact: {
    name: 'Test Eunice Paul',
    phone: '09189998888',
    relation: 'Mother',
  },
  application_history: {
    is_first_time_applicant: true,
    previous_application_notes: null,
  },
  spiritual_background: {
    ccf_member_since: '2021 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'None',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2020 Jan',
    leader_name: 'Test Paul Mentor',
    leader_email: 'paul@example.com',
    leader_phone: '09199998888',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  applicant_attested_at: '2026-11-01T08:00:00+08:00',
  survey_answers: { survey_q1: 'true' },
  survey_score: 20,
  survey_total: 20,
  current_step: 4,
  status: 'active',
  dgroup_approval_id: 'appr-1',
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: { first_sunday: ['9AM'] },
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-11-01T08:00:00+08:00',
  updated_at: '2026-11-01T08:00:00+08:00',
};

export const mockTransaction: RecruitmentPipelineTransaction = {
  id: 'tx-1',
  application_id: 'app-123',
  step_number: 4,
  step_key: 'observation',
  attempt_number: 1,
  transaction_type: 'scheduled',
  from_step: 3,
  to_step: 4,
  status: 'scheduled',
  assigned_reviewer_id: 'user-1',
  assigned_reviewer_name: 'Test Lead Usher',
  scheduled_at: '2026-11-10T09:00:00+08:00',
  completed_at: null,
  rubric_data: {},
  notes: 'First shadow session with seasoned team',
  applicant_visible_notes: 'Please arrive 15 minutes before 9AM service.',
  created_by_user_id: 'user-1',
  created_at: '2026-11-02T10:00:00+08:00',
};

export function renderDialog(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
