import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';

import { FormInputField } from '@/components/ui';
import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

type ApplicationHistorySectionProps = {
  form: UseFormReturn<RecruitmentStep1Input>;
};

export function ApplicationHistorySection({ form }: ApplicationHistorySectionProps) {
  const isFirstTimeApplicant = useWatch({
    control: form.control,
    name: 'application_history.is_first_time_applicant',
  });
  const hasAppliedBefore = !isFirstTimeApplicant;
  const { errors } = form.formState;

  return (
    <fieldset className="space-y-4">
      <legend className="font-heading text-base font-semibold text-text">
        Application History
      </legend>
      <Controller
        control={form.control}
        name="application_history.is_first_time_applicant"
        render={({ field }) => (
          <label className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 text-sm text-text">
            <input
              ref={field.ref}
              checked={!field.value}
              className="mt-0.5 h-4 w-4 min-h-0 shrink-0 self-start rounded border-border text-primary focus:ring-primary"
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(!event.target.checked)}
              type="checkbox"
            />
            <span>I have applied in the Welcome Center before.</span>
          </label>
        )}
      />
      {hasAppliedBefore && (
        <FormInputField
          label="What happened to your previous application?"
          required
          registration={form.register('application_history.previous_application_notes')}
          error={errors.application_history?.previous_application_notes?.message}
        />
      )}
    </fieldset>
  );
}
