import type { UseFormRegister, UseFormWatch } from 'react-hook-form';

import { FormSelectField } from '@/components/ui/FormSelectField';
import { SectionCard } from '@/components/ui/SectionCard';
import type { CreateEventInput } from '@/lib/domain/events';

type EventRegistrationSettingsSectionProps = {
  register: UseFormRegister<CreateEventInput>;
  watch?: UseFormWatch<CreateEventInput>;
  disabled?: boolean;
};

export function EventRegistrationSettingsSection({
  register,
  disabled,
}: EventRegistrationSettingsSectionProps) {
  return (
    <SectionCard title="Registration Settings">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelectField
            disabled={disabled}
            id="event-duplicate-policy"
            label="Duplicate Policy"
            options={[
              { value: 'block', label: 'Block (prevent re-registration)' },
              { value: 'allow_update', label: 'Allow Update (overwrite responses)' },
            ]}
            registration={register('duplicate_policy')}
            required
          />

          <FormSelectField
            disabled={disabled}
            id="event-registration-mode"
            label="Registration Mode"
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
            registration={register('registration_mode')}
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

        <div className="rounded-lg border border-border bg-background p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allow-public-registrations"
              disabled={disabled}
              {...register('allow_public_registrations')}
              className="h-4 w-4 cursor-pointer rounded border-border"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Allow public registrations</span>
              <span className="text-xs text-muted">
                Non-members can register for this event via public registration form
              </span>
            </div>
          </label>
        </div>
      </div>
    </SectionCard>
  );
}
