import type { UseFormRegister, UseFormWatch } from 'react-hook-form';

import { CheckboxField } from '@/components/ui/CheckboxField';
import { FormSelectField } from '@/components/ui/FormSelectField';
import { SectionCard } from '@/components/ui/SectionCard';
import type { CreateEventInput } from '@/lib/domain/events';

type EventRegistrationSettingsSectionProps = {
  register: UseFormRegister<CreateEventInput>;
  watch: UseFormWatch<CreateEventInput>;
  disabled?: boolean;
};

export function EventRegistrationSettingsSection({
  register,
  watch,
  disabled,
}: EventRegistrationSettingsSectionProps) {
  return (
    <SectionCard title="Registration Settings">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormSelectField
            disabled={disabled}
            id="event-duplicate-policy"
            label="Duplicate Policy"
            value={watch('duplicate_policy')}
            options={[
              { value: 'block', label: 'Block (prevent re-registration)' },
              { value: 'allow_update', label: 'Allow Update (overwrite responses)' },
              { value: 'allow_multiple', label: 'Allow Multiple Registrations' },
              {
                value: 'allow_multiple_update',
                label: 'Allow Multiple + Update by Unique Fields',
              },
            ]}
            registration={register('duplicate_policy')}
            required
          />

          <FormSelectField
            disabled={disabled}
            id="event-registration-mode"
            label="Registration Mode"
            value={watch('registration_mode')}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
            registration={register('registration_mode')}
            required
          />

          <FormSelectField
            disabled={disabled}
            id="event-public-registration-access"
            label="Allow Public Registrations"
            value={watch('public_registration_access')}
            options={[
              { value: 'members', label: 'Members' },
              { value: 'members_and_public', label: 'Members + Public' },
              { value: 'public', label: 'Public' },
            ]}
            registration={register('public_registration_access')}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CheckboxField
            id="allow-name-lookup"
            label="Allow name-based lookup"
            description="Members can search by name if they don't have their RFID"
            registration={register('allow_name_lookup')}
            disabled={disabled}
          />

          <CheckboxField
            id="send-email-after-completion"
            label="Send email after completion"
            description="Send an email confirmation when registration is completed"
            registration={register('send_email_after_completion')}
            disabled={disabled}
          />
        </div>
      </div>
    </SectionCard>
  );
}
