import type { UseFormRegister } from 'react-hook-form'
import type { CreateEventInput } from '../../../../lib/admin/eventSchema'
import { FormSelectField } from '../../../../components/ui/FormSelectField'
import { SectionCard } from '../../../../components/ui/SectionCard'

type EventRegistrationSettingsSectionProps = {
  register: UseFormRegister<CreateEventInput>
  disabled?: boolean
}

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
      </div>
    </SectionCard>
  )
}
