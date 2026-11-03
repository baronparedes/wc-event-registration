import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { ApplicantAttestationSection } from '../ApplicantAttestationSection';
import {
  type ApplicantAttestationForm,
  applicantAttestationSchema,
} from '../applicantAttestationSchema';

function AttestationHarness({ onContinue }: { onContinue: () => void }) {
  const form = useForm<ApplicantAttestationForm>({
    resolver: zodResolver(applicantAttestationSchema),
    defaultValues: { accepted: false },
  });

  return (
    <ApplicantAttestationSection
      form={form}
      isSubmitting={false}
      onContinue={onContinue}
      onBack={vi.fn()}
    />
  );
}

describe('ApplicantAttestationSection', () => {
  it('requires consent before continuing to verification', async () => {
    const onContinue = vi.fn();
    render(<AttestationHarness onContinue={onContinue} />);

    expect(screen.getByText('I have completed GLC Level 1 (Book 1 to 4).')).toBeInTheDocument();
    expect(
      screen.getByText(
        'I confirm the truth of the foregoing and hereby commit with all my heart to continue living my life pursuant to these principles.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Verification' }));
    expect(
      await screen.findByText('Please confirm the attestation to submit.'),
    ).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('I agree.'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Verification' }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce());
  });
});
