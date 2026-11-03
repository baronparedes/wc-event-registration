import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { ApplicantVerificationSection } from '../ApplicantVerificationSection';

const application: RecruitmentStep1Input = {
  email: 'test.applicant@example.com',
  first_name: 'Test Applicant',
  middle_name: null,
  last_name: 'Test Member',
  nickname: 'Test',
  phone: '09171234567',
  date_of_birth: '1990-01-01',
  gender: 'Female',
  life_stage: 'Single',
  desired_role: 'Prayer Coach',
  personal_details: { occupation: 'Teacher', company_name: null, wedding_anniversary: null },
  emergency_contact: { name: 'Test Contact', phone: '09179876543', relation: 'Sibling' },
  application_history: { is_first_time_applicant: true },
  spiritual_background: {
    ccf_member_since: '2010 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2010 Jan',
    leader_name: 'Test Leader',
    leader_email: 'test.leader@example.com',
    leader_phone: '09171112222',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  survey_answers: {},
  applicant_attested: true,
};

describe('ApplicantVerificationSection', () => {
  it('shows placeholders for optional values and first-time applicant history', () => {
    render(<ApplicantVerificationSection application={application} surveyAnswers={[]} />);

    expect(screen.getAllByText('Not provided')).toHaveLength(7);
    expect(screen.getByText('Not applicable')).toBeInTheDocument();
    expect(screen.getByText('First time applying')).toBeInTheDocument();
  });

  it('shows supplied optional values and returning-applicant details', () => {
    render(
      <ApplicantVerificationSection
        application={{
          ...application,
          middle_name: 'Sample Middle',
          personal_details: {
            occupation: 'Teacher',
            company_name: 'Sample School',
            wedding_anniversary: '2020-01-01',
          },
          application_history: {
            is_first_time_applicant: false,
            previous_application_notes: 'Test previous application details',
          },
          spiritual_background: {
            ...application.spiritual_background,
            other_ministries: 'Test Ministry',
            glc2_status: 'Ongoing',
          },
          dgroup_info: {
            ...application.dgroup_info,
            is_constant_attendee: false,
            leader_since: '2018 Jan',
            dgroup_member_count: 7,
          },
        }}
        surveyAnswers={[
          { fieldKey: 'survey_q1', question: 'Test survey item', answer: 'True' },
          { fieldKey: 'survey_q2', question: '', answer: 'False' },
        ]}
      />,
    );

    expect(screen.getByText('Sample Middle')).toBeInTheDocument();
    expect(screen.getByText('Sample School')).toBeInTheDocument();
    expect(screen.getByText('Test previous application details')).toBeInTheDocument();
    expect(screen.queryByText('Not applicable')).not.toBeInTheDocument();
    expect(screen.getByText('Number of DGroup Members')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Test survey item')).toBeInTheDocument();
    expect(screen.getByText('survey_q2')).toBeInTheDocument();
  });
});
