import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Badge, FormInputField, FormTextareaField } from '@/components/ui';
import type { RecruitmentSettingsInput } from '@/lib/domain/recruitment';

interface GeneralSettingsTabProps {
  control: Control<RecruitmentSettingsInput>;
  register: UseFormRegister<RecruitmentSettingsInput>;
  errors: FieldErrors<RecruitmentSettingsInput>;
  isRecruitmentOpen: boolean;
}

export function GeneralSettingsTab({
  control,
  register,
  errors,
  isRecruitmentOpen,
}: GeneralSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Intake Status Banner & Switch */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-text">Intake Status</h3>
            <Badge variant={isRecruitmentOpen ? 'default' : 'secondary'}>
              {isRecruitmentOpen ? 'Open for Applications' : 'Closed'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            When closed, the recruitment banner on the WelcomeHub home page and kiosk applications
            will indicate recruitment is currently closed.
          </p>
        </div>

        <Controller
          name="is_recruitment_open"
          control={control}
          render={({ field }) => (
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                className="peer sr-only"
                aria-label="Toggle recruitment intake status"
              />
              <div className="peer h-6 w-11 rounded-full bg-border peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
          )}
        />
      </div>

      {/* External VMT & Orientation Configuration */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-base font-bold text-text">Step 3 & Step 7 Workflows</h3>

        <FormInputField
          label="CCF VMT Registration URL"
          placeholder="https://vmt.ccf.org.ph/register"
          registration={register('vmt_registration_url')}
          error={errors.vmt_registration_url?.message}
          helperText="External link presented to applicants in Step 7 to register their profile in the CCF Volunteer Management database."
        />

        <FormTextareaField
          label="Step 3 Orientation Instructions"
          placeholder="Enter instructions and logistical details for scheduled orientation attendees..."
          rows={4}
          textareaClassName="resize-none"
          registration={register('orientation_instructions')}
          error={errors.orientation_instructions?.message}
          helperText="Orientation guidelines and instructions displayed to candidates on their own-phone progress portal."
        />
      </div>

      {/* Eligibility Rules */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-heading text-base font-bold text-text">Pre-Qualification Gates</h3>
        <p className="text-xs text-muted">
          System eligibility constraints enforced during Step 1 kiosk and online intake.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormInputField
            label="Minimum Age"
            type="number"
            registration={register('eligibility_rules.min_age', { valueAsNumber: true })}
            error={errors.eligibility_rules?.min_age?.message}
          />
          <FormInputField
            label="Maximum Age"
            type="number"
            registration={register('eligibility_rules.max_age', { valueAsNumber: true })}
            error={errors.eligibility_rules?.max_age?.message}
          />
          <FormInputField
            label="Min. DGroup Months"
            type="number"
            registration={register('eligibility_rules.min_dgroup_months', { valueAsNumber: true })}
            error={errors.eligibility_rules?.min_dgroup_months?.message}
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              {...register('eligibility_rules.requires_glc1_completed')}
            />
            Require GLC 1 Course Completion (Book 1 to 4)
          </label>
        </div>
      </div>
    </div>
  );
}
