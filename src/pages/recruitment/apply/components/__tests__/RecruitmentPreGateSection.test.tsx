import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecruitmentPreGateSection } from '../RecruitmentPreGateSection';

describe('RecruitmentPreGateSection', () => {
  it('keeps the wizard visible below a static Before you apply header', () => {
    render(<RecruitmentPreGateSection onContinue={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Before you apply' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Collapse application requirements/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Expand application requirements/ })).toBeNull();
    expect(screen.getByText('Eligibility steps')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 1: Roles' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Backroom Support' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeVisible();
    expect(
      screen.getByRole('region', { name: 'Roles' }).querySelector('.grid-cols-1'),
    ).toBeInTheDocument();

    const rolesAgreement = screen.getByLabelText(
      'I have read and understood the roles available at the Welcome Center.',
    );
    expect(rolesAgreement).toHaveClass('shrink-0');
    expect(rolesAgreement).toHaveClass('min-h-0', 'self-start');
    expect(rolesAgreement.parentElement).toHaveClass('grid', 'grid-cols-[1rem_minmax(0,1fr)]');
    expect(
      screen.getByLabelText("I confirm that I have completed CCF's GLC Level 1 (Book 1 to 4)."),
    ).toHaveClass('shrink-0');
    expect(screen.getByLabelText('I confirm that I can commit for 4 Services.')).toHaveClass(
      'shrink-0',
    );
    expect(screen.getByRole('heading', { name: 'Applicant Confirmation' })).toBeVisible();
  });

  it('opens the full privacy policy in a modal from Gate 2', async () => {
    render(<RecruitmentPreGateSection onContinue={vi.fn()} />);

    fireEvent.click(
      screen.getByLabelText(
        'I have read and understood the roles available at the Welcome Center.',
      ),
    );
    fireEvent.click(
      screen.getByLabelText("I confirm that I have completed CCF's GLC Level 1 (Book 1 to 4)."),
    );
    fireEvent.click(screen.getByLabelText('I confirm that I can commit for 4 Services.'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Step 2: Data Privacy and Liability Waiver' });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Step 1: Roles' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Step 2: Data Privacy and Liability Waiver' });

    fireEvent.click(screen.getByRole('button', { name: 'Read the privacy policy' }));

    expect(screen.getByRole('dialog', { name: 'Privacy Policy' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '1. Introduction' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders Markdown formatting in role responsibilities', () => {
    render(<RecruitmentPreGateSection onContinue={vi.fn()} />);

    expect(
      screen.getByText(
        'We have the following roles available from which you can choose. Please take a few moments to read through.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Provides a warm and friendly welcome to the guests, gives information about CCF and its ministries, prays for the guests, and shares the gospel as needed.',
      ),
    ).toBeInTheDocument();
    const requirementStatements = screen.getAllByText(
      "This role requires that you have completed CCF's GLC LEVEL 1 (Book 1 to 4).",
    );
    expect(requirementStatements).toHaveLength(4);
    requirementStatements.forEach((statement) => expect(statement).toHaveClass('text-text'));
    expect(screen.getAllByRole('list').length).toBeGreaterThan(0);
  });

  it('advances through the four pre-qualification gates only when each gate is satisfied', async () => {
    const onContinue = vi.fn();
    render(<RecruitmentPreGateSection onContinue={onContinue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('Please review the eligibility checks above before continuing.'),
    ).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/I have read and understood the roles/i));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('GLC Level 1 completion is required.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 1: Roles' })).toBeVisible();

    fireEvent.click(
      screen.getByLabelText("I confirm that I have completed CCF's GLC Level 1 (Book 1 to 4)."),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Commitment for 4 Services is required.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 1: Roles' })).toBeVisible();

    fireEvent.click(screen.getByLabelText('I confirm that I can commit for 4 Services.'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Step 2: Data Privacy and Liability Waiver' }),
    ).toBeVisible();

    fireEvent.click(screen.getByLabelText('I agree.'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Step 3: DGroup Eligibility' }),
    ).toBeVisible();

    const dgroupAttendanceSelect = screen.getByRole('button', {
      name: 'Are you part of a DGroup and constantly attending for more than 6 months?',
    });
    fireEvent.click(dgroupAttendanceSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Yes' }));
    expect(dgroupAttendanceSelect).toHaveTextContent('Yes');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Step 4: Demographics' })).toBeVisible();

    const ageRangeSelect = screen.getByRole('button', { name: 'Select demographics' });
    fireEvent.click(ageRangeSelect);
    fireEvent.click(screen.getByRole('option', { name: '18 to 45 years old' }));
    expect(ageRangeSelect).toHaveTextContent('18 to 45 years old');
    fireEvent.click(screen.getByRole('button', { name: /Continue to application/i }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
  });
});
