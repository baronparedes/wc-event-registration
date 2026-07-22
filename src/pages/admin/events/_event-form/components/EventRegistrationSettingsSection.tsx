import type { UseFormRegister, UseFormWatch } from 'react-hook-form';

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

        <div className="rounded-lg border border-border bg-background p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allow-name-lookup"
              disabled={disabled}
              {...register('allow_name_lookup')}
              className="h-4 w-4 cursor-pointer rounded border-border"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Allow name-based lookup</span>
              <span className="text-xs text-muted">
                Members can search by name if they don't have their RFID
              </span>
            </div>
          </label>
        </div>
      </div>
    </SectionCard>
  );
}
