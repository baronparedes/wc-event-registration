import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { WizardStep } from '@/components/ui/WizardStep';

import { type GuestInfoValues, guestInfoSchema } from './guest-info-schema';

type GuestInfoStepCardProps = {
  onSubmit: (data: GuestInfoValues) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<GuestInfoValues>;
  allowSwitchToMember?: boolean;
  onSwitchToMember?: () => void;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function GuestInfoStepCard({
  onSubmit,
  isSubmitting = false,
  defaultValues,
  allowSwitchToMember = false,
  onSwitchToMember,
  inactivityTimeoutMs,
  onInactivityTimeout,
}: GuestInfoStepCardProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<GuestInfoValues>({
    resolver: zodResolver(guestInfoSchema),
    mode: 'onBlur',
    defaultValues: {
      first_name: defaultValues?.first_name ?? '',
      last_name: defaultValues?.last_name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
    },
  });

  return (
    <WizardStep
      title="Step 1: Respondent Information"
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) => `Resetting in ${s}s if inactive.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInputField
            id="first-name"
            label="First Name"
            placeholder="John"
            registration={register('first_name')}
            error={errors.first_name?.message}
            required
          />

          <FormInputField
            id="last-name"
            label="Last Name"
            placeholder="Doe"
            registration={register('last_name')}
            error={errors.last_name?.message}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInputField
            id="email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            registration={register('email')}
            error={errors.email?.message}
            required
          />

          <FormInputField
            id="phone"
            label="Phone Number (Optional)"
            placeholder="09XX XXX XXXX"
            registration={register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button className="w-full" type="submit" disabled={isSubmitting || isFormSubmitting}>
            {isSubmitting || isFormSubmitting ? 'Continuing...' : 'Continue to Questions'}
          </Button>

          {allowSwitchToMember && onSwitchToMember && (
            <Button
              type="button"
              variant="primaryOutline"
              className="w-full"
              onClick={onSwitchToMember}
            >
              I am a Member
            </Button>
          )}
        </div>
      </form>
    </WizardStep>
  );
}
