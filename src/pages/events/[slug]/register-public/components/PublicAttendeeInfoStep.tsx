import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { SectionCard } from '@/components/ui/SectionCard';
import { publicAttendeeInfoSchema } from '@/lib/domain/public-registrations';
import type { PublicAttendeeInfoInput } from '@/lib/domain/public-registrations';

type PublicAttendeeInfoStepProps = {
  onSubmit: (data: PublicAttendeeInfoInput) => void;
  isSubmitting?: boolean;
  emailErrorMessage?: string;
  defaultValues?: PublicAttendeeInfoInput;
};

export function PublicAttendeeInfoStep({
  onSubmit,
  isSubmitting = false,
  emailErrorMessage,
  defaultValues,
}: PublicAttendeeInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<PublicAttendeeInfoInput>({
    resolver: zodResolver(publicAttendeeInfoSchema),
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <SectionCard title="Step 1: Your Information">
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

        <FormInputField
          id="nickname"
          label="Nickname (Optional)"
          placeholder="Johnny"
          registration={register('nickname')}
          error={errors.nickname?.message}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInputField
            id="email"
            label="Email"
            type="email"
            placeholder="john@example.com"
            registration={register('email')}
            error={errors.email?.message || emailErrorMessage}
            required
          />

          <FormInputField
            id="phone"
            label="Phone (Optional)"
            placeholder="09XX XXX XXXX"
            registration={register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || isFormSubmitting}
            onClick={() => handleSubmit(onSubmit)()}
          >
            {isSubmitting || isFormSubmitting ? 'Continue...' : 'Continue'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
