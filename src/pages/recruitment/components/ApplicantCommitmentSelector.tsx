import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui';
import { RECRUITMENT_SERVICE_SLOTS } from '@/lib/domain/recruitment';
import {
  type ApplicantCommitments,
  type ApplicantCommitmentsInput,
  applicantCommitmentsSchema,
} from '@/lib/domain/recruitment';

type ApplicantCommitmentSelectorProps = {
  commitments: ApplicantCommitments;
  isSaving: boolean;
  onSave: (commitments: ApplicantCommitmentsInput) => void;
};

const SUNDAYS = [
  ['first_sunday', '1st Sunday'],
  ['second_sunday', '2nd Sunday'],
  ['third_sunday', '3rd Sunday'],
  ['fourth_sunday', '4th Sunday'],
  ['fifth_sunday', '5th Sunday'],
] as const;

export function ApplicantCommitmentSelector({
  commitments,
  isSaving,
  onSave,
}: ApplicantCommitmentSelectorProps) {
  const form = useForm<ApplicantCommitmentsInput>({
    resolver: zodResolver(applicantCommitmentsSchema),
    defaultValues: commitments,
  });
  const { errors } = form.formState;
  const handleSubmit = form.handleSubmit(onSave, () => {
    const hasSelectedSlot = Object.values(form.getValues()).some(
      (slots) => (slots?.length ?? 0) > 0,
    );
    if (!hasSelectedSlot) {
      form.setError('root', {
        type: 'validate',
        message: 'Select at least one Sunday service slot',
      });
    }
  });

  return (
    <form
      className="mt-3 space-y-4 rounded-md border border-border bg-background p-4"
      onSubmit={handleSubmit}
    >
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-text">Sunday Service Commitments</legend>
        {SUNDAYS.map(([fieldName, label]) => (
          <fieldset key={fieldName} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="w-full text-sm text-muted">{label}</legend>
            {RECRUITMENT_SERVICE_SLOTS.map((slot) => (
              <label key={slot} className="inline-flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  value={slot}
                  {...form.register(fieldName)}
                  className="h-4 w-4 min-h-0 shrink-0 rounded border-border text-primary focus:ring-primary"
                />
                {slot}
              </label>
            ))}
          </fieldset>
        ))}
      </fieldset>
      {errors.root?.message && <p className="text-sm text-danger">{errors.root.message}</p>}
      <Button disabled={isSaving} size="sm" type="submit">
        {isSaving ? 'Saving...' : 'Save Sunday Commitments'}
      </Button>
    </form>
  );
}
