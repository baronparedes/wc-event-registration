import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';

import { FormInputField, FormSelectField } from '@/components/ui';
import { RECRUITMENT_ROLES, type RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { calculateAge } from '../utils';
import { ApplicantAvatarPicker } from './ApplicantAvatarPicker';

type PersonalAndWorkSectionProps = {
  form: UseFormReturn<RecruitmentStep1Input>;
};

const genderOptions = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
];

const lifeStageOptions = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
];

export function PersonalAndWorkSection({ form }: PersonalAndWorkSectionProps) {
  const dateOfBirth = useWatch({ control: form.control, name: 'date_of_birth' });
  const lifeStage = useWatch({ control: form.control, name: 'life_stage' });
  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const { errors } = form.formState;

  return (
    <section className="space-y-5" aria-labelledby="personal-work-heading">
      <header>
        <h2 id="personal-work-heading" className="text-xl font-semibold text-text">
          Personal and Work Information
        </h2>
        <p className="mt-1 text-sm text-muted">Share your preferred role and personal details.</p>
      </header>

      <Controller
        control={form.control}
        name="avatar_image_base64"
        render={({ field }) => (
          <ApplicantAvatarPicker value={field.value} onChange={field.onChange} />
        )}
      />

      <fieldset className="space-y-4">
        <legend className="font-heading text-base font-semibold text-text">Desired Role</legend>
        <Controller
          control={form.control}
          name="desired_role"
          render={({ field }) => (
            <FormSelectField
              id="desired-role"
              label="Desired Role"
              required
              value={field.value}
              onChange={field.onChange}
              options={RECRUITMENT_ROLES.map((role) => ({
                value: role,
                label: role,
                disabled: role === 'Backroom Support',
              }))}
              error={errors.desired_role?.message}
            />
          )}
        />
      </fieldset>

      <hr className="border-border" aria-hidden="true" />
      <fieldset className="space-y-4">
        <legend className="font-heading text-base font-semibold text-text">
          Personal Information
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInputField
            label="First Name"
            required
            registration={form.register('first_name')}
            error={errors.first_name?.message}
          />
          <FormInputField
            label="Middle Name"
            registration={form.register('middle_name')}
            error={errors.middle_name?.message}
          />
          <FormInputField
            label="Last Name"
            required
            registration={form.register('last_name')}
            error={errors.last_name?.message}
          />
          <FormInputField
            label="Nickname"
            required
            registration={form.register('nickname')}
            error={errors.nickname?.message}
          />
          <div>
            <FormInputField
              label="Date of Birth"
              type="date"
              required
              registration={form.register('date_of_birth')}
              error={errors.date_of_birth?.message}
            />
            <p aria-live="polite" className="mt-1 text-xs text-muted">
              {age === null ? 'Age will appear after you enter your date of birth.' : `Age: ${age}`}
            </p>
          </div>
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormSelectField
                id="applicant-gender"
                label="Gender"
                required
                value={field.value}
                onChange={field.onChange}
                options={genderOptions}
                error={errors.gender?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="life_stage"
            render={({ field }) => (
              <FormSelectField
                id="applicant-life-stage"
                label="Life Stage"
                required
                value={field.value}
                onChange={field.onChange}
                options={lifeStageOptions}
                error={errors.life_stage?.message}
              />
            )}
          />
          {lifeStage === 'Married' && (
            <FormInputField
              label="Wedding Anniversary"
              type="date"
              required
              registration={form.register('personal_details.wedding_anniversary')}
              error={errors.personal_details?.wedding_anniversary?.message}
            />
          )}
        </div>
      </fieldset>

      <hr className="border-border" aria-hidden="true" />
      <fieldset className="space-y-4">
        <legend className="font-heading text-base font-semibold text-text">
          Contact Information
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInputField
            label="Email"
            type="email"
            required
            autoComplete="email"
            registration={form.register('email')}
            error={errors.email?.message}
          />
          <FormInputField
            label="Mobile Number"
            type="tel"
            required
            autoComplete="tel"
            registration={form.register('phone')}
            error={errors.phone?.message}
          />
        </div>
      </fieldset>

      <hr className="border-border" aria-hidden="true" />
      <fieldset className="space-y-4">
        <legend className="font-heading text-base font-semibold text-text">Work Information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInputField
            label="Occupation"
            required
            registration={form.register('personal_details.occupation')}
            error={errors.personal_details?.occupation?.message}
          />
          <FormInputField
            label="Company Name"
            registration={form.register('personal_details.company_name')}
            error={errors.personal_details?.company_name?.message}
          />
        </div>
      </fieldset>
    </section>
  );
}
