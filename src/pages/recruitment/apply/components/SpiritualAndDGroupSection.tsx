import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';

import { FormInputField, FormSelectField, FormTextareaField } from '@/components/ui';
import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { formatMonthYearDuration } from '../utils';
import { MonthYearField } from './MonthYearField';

type SpiritualAndDGroupSectionProps = {
  form: UseFormReturn<RecruitmentStep1Input>;
};

const courseStatusOptions = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'None', label: 'None' },
];

const yesNoOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export function SpiritualAndDGroupSection({ form }: SpiritualAndDGroupSectionProps) {
  const ccfMemberSince = useWatch({
    control: form.control,
    name: 'spiritual_background.ccf_member_since',
  });
  const glc1Status = useWatch({
    control: form.control,
    name: 'spiritual_background.glc1_status',
  });
  const dgroupMemberSince = useWatch({ control: form.control, name: 'dgroup_info.member_since' });
  const { errors } = form.formState;

  return (
    <section className="space-y-6" aria-labelledby="spiritual-dgroup-heading">
      <header>
        <h2 id="spiritual-dgroup-heading" className="text-xl font-semibold text-text">
          Spiritual Background and DGroup
        </h2>
      </header>
      <fieldset className="space-y-4 border-b border-border pb-5">
        <legend className="font-heading text-base font-semibold text-text">
          Spiritual Background
        </legend>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <div>
            <MonthYearField
              control={form.control}
              name="spiritual_background.ccf_member_since"
              label="CCF Member Since"
              error={errors.spiritual_background?.ccf_member_since?.message}
            />
            {ccfMemberSince && formatMonthYearDuration(ccfMemberSince) && (
              <p className="mt-1 text-xs text-muted">
                Member for {formatMonthYearDuration(ccfMemberSince)}.
              </p>
            )}
          </div>
          <FormTextareaField
            id="other-ministries"
            label="Other Ministries"
            registration={form.register('spiritual_background.other_ministries')}
            error={errors.spiritual_background?.other_ministries?.message}
            rows={3}
            textareaClassName="resize-none"
          />
          <Controller
            control={form.control}
            name="spiritual_background.glc1_status"
            render={({ field }) => (
              <FormSelectField
                id="glc1-status"
                label="GLC 1 Course Status"
                required
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  form.setValue('spiritual_background.glc2_status', undefined);
                }}
                options={courseStatusOptions}
                error={errors.spiritual_background?.glc1_status?.message}
              />
            )}
          />
          {glc1Status === 'Completed' && (
            <Controller
              control={form.control}
              name="spiritual_background.glc2_status"
              render={({ field }) => (
                <FormSelectField
                  id="glc2-status"
                  label="GLC 2 Course Status"
                  required
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={courseStatusOptions}
                  error={errors.spiritual_background?.glc2_status?.message}
                />
              )}
            />
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-b border-border pb-5">
        <legend className="font-heading text-base font-semibold text-text">
          DGroup Membership
        </legend>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="dgroup_info.is_constant_attendee"
            render={({ field }) => (
              <FormSelectField
                id="constant-dgroup-attendee"
                label="Constant DGroup Attendee"
                required
                value={field.value === undefined ? '' : field.value ? 'true' : 'false'}
                onChange={(value) => field.onChange(value === 'true')}
                options={yesNoOptions}
                error={errors.dgroup_info?.is_constant_attendee?.message}
              />
            )}
          />
          <div>
            <MonthYearField
              control={form.control}
              name="dgroup_info.member_since"
              label="DGroup Member Since"
              error={errors.dgroup_info?.member_since?.message}
              helperText="You must have attended consistently for more than six months."
            />
            {dgroupMemberSince && formatMonthYearDuration(dgroupMemberSince) && (
              <p className="mt-1 text-xs text-muted">
                DGroup tenure: {formatMonthYearDuration(dgroupMemberSince)}.
              </p>
            )}
          </div>
          <FormInputField
            label="Name of DGroup Leader"
            required
            registration={form.register('dgroup_info.leader_name')}
            error={errors.dgroup_info?.leader_name?.message}
          />
          <FormInputField
            label="Email of DGroup Leader"
            type="email"
            required
            registration={form.register('dgroup_info.leader_email')}
            error={errors.dgroup_info?.leader_email?.message}
          />
          <FormInputField
            label="Mobile Number of DGroup Leader"
            type="tel"
            required
            registration={form.register('dgroup_info.leader_phone')}
            error={errors.dgroup_info?.leader_phone?.message}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-heading text-base font-semibold text-text">
          DGroup Leadership <span className="font-normal text-muted">(Optional)</span>
        </legend>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <MonthYearField
            control={form.control}
            name="dgroup_info.leader_since"
            label="DGroup Leader Since"
            required={false}
            error={errors.dgroup_info?.leader_since?.message}
          />
          <FormInputField
            label="How many members do you have?"
            type="number"
            min={1}
            required={false}
            registration={form.register('dgroup_info.dgroup_member_count', {
              setValueAs: (value: unknown) => {
                const normalizedValue = typeof value === 'string' ? value.trim() : '';
                return normalizedValue ? Number(normalizedValue) : null;
              },
            })}
            error={errors.dgroup_info?.dgroup_member_count?.message}
          />
        </div>
      </fieldset>
    </section>
  );
}
