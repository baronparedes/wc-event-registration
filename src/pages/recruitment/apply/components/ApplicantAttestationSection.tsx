import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui';

import {
  RECRUITMENT_APPLICANT_ATTESTATION,
  RECRUITMENT_APPLICANT_ATTESTATION_CONFIRMATION,
} from '../copy';
import type { ApplicantAttestationForm } from './applicantAttestationSchema';

type ApplicantAttestationSectionProps = {
  isSubmitting: boolean;
  form: UseFormReturn<ApplicantAttestationForm>;
  onContinue: () => void;
  onBack: () => void;
};

export function ApplicantAttestationSection({
  isSubmitting,
  form,
  onContinue,
  onBack,
}: ApplicantAttestationSectionProps) {
  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onContinue)}>
      <header>
        <h2 className="text-xl font-semibold text-text">Applicant Attestation</h2>
      </header>
      <div className="border-l-2 border-accent bg-surface px-4 py-3 text-sm text-text">
        <ol className="list-decimal space-y-2 pl-5">
          {RECRUITMENT_APPLICANT_ATTESTATION.map((statement) => (
            <li key={statement}>{statement}</li>
          ))}
        </ol>
        <p className="mt-4 font-medium">{RECRUITMENT_APPLICANT_ATTESTATION_CONFIRMATION}</p>
      </div>
      <label className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 text-sm text-text">
        <input
          className="mt-0.5 h-4 w-4 min-h-0 shrink-0 self-start rounded border-border text-primary focus:ring-primary"
          type="checkbox"
          {...form.register('accepted')}
        />
        <span>I agree.</span>
      </label>
      {form.formState.errors.accepted?.message && (
        <p className="text-sm text-danger">{form.formState.errors.accepted.message}</p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button disabled={isSubmitting} onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button disabled={isSubmitting} type="submit">
          Continue to Verification
        </Button>
      </div>
    </form>
  );
}
