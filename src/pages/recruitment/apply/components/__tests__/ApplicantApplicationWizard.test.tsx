import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PublicRecruitmentConfig, RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { ApplicantApplicationWizard } from '../ApplicantApplicationWizard';

const config: PublicRecruitmentConfig = {
  is_recruitment_open: true,
  eligibility_rules: {
    min_age: 18,
    max_age: 45,
    requires_glc1_completed: true,
    min_dgroup_months: 6,
  },
  vmt_registration_url: 'https://example.com/vmt',
  orientation_instructions: 'Attend the scheduled orientation.',
  survey_questions: [
    {
      field_key: 'survey_q1',
      label: 'Test survey question',
      field_type: 'radio',
      is_required: true,
      is_active: true,
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
    {
      field_key: 'survey_q2',
      label: 'Test optional survey question',
      field_type: 'radio',
      is_required: false,
      is_active: true,
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
  ],
};

function changeField(name: string, value: string) {
  const field = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (!field) throw new Error(`Missing input: ${name}`);
  fireEvent.change(field, { target: { value } });
}

function changeLabeledField(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function selectOption(triggerName: string, optionName: string) {
  fireEvent.click(screen.getByRole('button', { name: triggerName }));
  fireEvent.click(screen.getByRole('option', { name: optionName }));
}

function selectRadio(fieldKey: string, value: 'true' | 'false') {
  const radio = document.querySelector<HTMLInputElement>(
    `input[type="radio"][name="${fieldKey}"][value="${value}"]`,
  );
  if (!radio) throw new Error(`Missing ${value} radio for ${fieldKey}`);
  fireEvent.click(radio);
}

function renderWizard(onSubmit = vi.fn<(application: RecruitmentStep1Input) => void>()) {
  const onBackToGates = vi.fn();
  render(
    <ApplicantApplicationWizard
      config={config}
      isSubmitting={false}
      onBackToGates={onBackToGates}
      onSubmit={onSubmit}
    />,
  );
  return { onBackToGates, onSubmit };
}

describe('ApplicantApplicationWizard', () => {
  it('validates each section, reviews the answers, and submits from Verification', async () => {
    const { onSubmit } = renderWizard();

    selectOption('Desired Role *', 'Prayer Coach');
    changeField('first_name', 'Test Applicant');
    changeField('last_name', 'Test Member');
    changeField('nickname', 'Test');
    changeField('date_of_birth', '1990-01-01');
    selectOption('Gender *', 'Female');
    selectOption('Life Stage *', 'Married');
    changeField('personal_details.wedding_anniversary', '2020-01-01');
    changeField('email', 'test.applicant@example.com');
    changeField('phone', '09171234567');
    changeField('personal_details.occupation', 'Teacher');
    changeField('emergency_contact.name', 'Test Contact');
    changeField('emergency_contact.phone', '09179876543');
    selectOption('Relation to the Applicant *', 'Sibling');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Application: Section 2 of 5' }),
    ).toBeVisible();

    changeLabeledField(/CCF Member Since/, '2010-01');
    selectOption('GLC 1 Course Status *', 'Completed');
    selectOption('GLC 2 Course Status *', 'Ongoing');
    selectOption('Constant DGroup Attendee *', 'Yes');
    changeLabeledField(/DGroup Member Since/, '2010-01');
    changeField('dgroup_info.leader_name', 'Test Leader');
    changeField('dgroup_info.leader_email', 'test.leader@example.com');
    changeField('dgroup_info.leader_phone', '09171112222');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Application: Section 3 of 5' }),
    ).toBeVisible();

    selectRadio('survey_q1', 'true');
    selectRadio('survey_q2', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Application: Section 4 of 5' }),
    ).toBeVisible();

    fireEvent.click(screen.getByLabelText('I agree.'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Verification' }));
    expect(
      await screen.findByRole('heading', { name: 'Application: Section 5 of 5' }),
    ).toBeVisible();
    expect(screen.getByText('Test survey question')).toBeInTheDocument();
    expect(screen.getByText('Test optional survey question')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].survey_answers).toEqual({
      survey_q1: 'true',
      survey_q2: 'false',
    });
  });

  it('returns to the gates from step one and blocks invalid form data', async () => {
    const { onBackToGates, onSubmit } = renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Desired Role *' }));
    expect(screen.getByRole('option', { name: 'Backroom Support' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    fireEvent.click(screen.getByLabelText('I have applied in the Welcome Center before.'));
    expect(
      document.querySelector('[name="application_history.previous_application_notes"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBackToGates).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the applicant on the survey until required answers are supplied', async () => {
    const { onSubmit } = renderWizard();

    selectOption('Desired Role *', 'Prayer Coach');
    changeField('first_name', 'Test Applicant');
    changeField('last_name', 'Test Member');
    changeField('nickname', 'Test');
    changeField('date_of_birth', '1990-01-01');
    selectOption('Gender *', 'Female');
    selectOption('Life Stage *', 'Married');
    changeField('personal_details.wedding_anniversary', '2020-01-01');
    changeField('email', 'test.applicant@example.com');
    changeField('phone', '09171234567');
    changeField('personal_details.occupation', 'Teacher');
    changeField('emergency_contact.name', 'Test Contact');
    changeField('emergency_contact.phone', '09179876543');
    selectOption('Relation to the Applicant *', 'Sibling');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Application: Section 2 of 5' });

    changeLabeledField(/CCF Member Since/, '2010-01');
    selectOption('GLC 1 Course Status *', 'Completed');
    selectOption('GLC 2 Course Status *', 'Ongoing');
    selectOption('Constant DGroup Attendee *', 'Yes');
    changeLabeledField(/DGroup Member Since/, '2010-01');
    changeField('dgroup_info.leader_name', 'Test Leader');
    changeField('dgroup_info.leader_email', 'test.leader@example.com');
    changeField('dgroup_info.leader_phone', '09171112222');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Application: Section 3 of 5' });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Test survey question is required.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Application: Section 3 of 5' })).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
