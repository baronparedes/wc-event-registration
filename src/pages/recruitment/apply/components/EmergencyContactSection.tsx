import { Controller, type UseFormReturn } from 'react-hook-form';

import { FormInputField, FormSelectField } from '@/components/ui';
import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

type EmergencyContactSectionProps = {
  form: UseFormReturn<RecruitmentStep1Input>;
};

const relationOptions = [
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Child', label: 'Child' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Other', label: 'Other' },
];

export function EmergencyContactSection({ form }: EmergencyContactSectionProps) {
  const { errors } = form.formState;

  return (
    <fieldset className="space-y-4">
      <legend className="font-heading text-base font-semibold text-text">Emergency Contact</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInputField
          label="Emergency Contact Name"
          required
          registration={form.register('emergency_contact.name')}
          error={errors.emergency_contact?.name?.message}
        />
        <FormInputField
          label="Emergency Contact Number"
          type="tel"
          required
          registration={form.register('emergency_contact.phone')}
          error={errors.emergency_contact?.phone?.message}
        />
        <Controller
          control={form.control}
          name="emergency_contact.relation"
          render={({ field }) => (
            <FormSelectField
              id="emergency-contact-relation"
              label="Relation to the Applicant"
              required
              value={field.value}
              onChange={field.onChange}
              options={relationOptions}
              error={errors.emergency_contact?.relation?.message}
            />
          )}
        />
      </div>
    </fieldset>
  );
}
