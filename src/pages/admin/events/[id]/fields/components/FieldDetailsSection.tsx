import type { UseFormRegisterReturn } from 'react-hook-form'
import type { AdminEventField } from '@/lib/domain/event-fields'
import { SectionCard } from '@/components/ui/SectionCard'
import { FormInputField } from '@/components/ui/FormInputField'
import { CheckboxField } from './CheckboxField'

type FieldDetailsSectionProps = {
  isEditing: boolean
  isFullyLocked: boolean
  isStructurallyLocked: boolean
  field: AdminEventField | null
  fieldKeyRegistration: UseFormRegisterReturn
  labelRegistration: UseFormRegisterReturn
  isRequiredRegistration: UseFormRegisterReturn
  isActiveRegistration: UseFormRegisterReturn
  errors: {
    field_key?: { message?: string }
    label?: { message?: string }
  }
}

/** Section for field name, label, and required/active checkboxes. */
export function FieldDetailsSection({
  isEditing,
  isFullyLocked,
  isStructurallyLocked,
  field,
  fieldKeyRegistration,
  labelRegistration,
  isRequiredRegistration,
  isActiveRegistration,
  errors,
}: FieldDetailsSectionProps) {
  return (
    <SectionCard title="Field Details">
      <div className="space-y-4">
        {/* Field name — create mode only; read-only in edit mode */}
        {!isEditing ? (
          <FormInputField
            id="field_key"
            label="Field Name"
            registration={fieldKeyRegistration}
            error={errors.field_key?.message}
            required
            placeholder="e.g., team_name"
            helperText="Unique identifier used internally. Lowercase letters, numbers, and underscores only. Cannot be changed after creation."
            disabled={isFullyLocked}
          />
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-text">Field Name</p>
            <p className="rounded-md border border-border bg-gray-100 px-3 py-2 text-sm text-gray-700">
              {field?.field_key}
              <span className="ml-2 text-xs text-gray-600">(cannot be changed)</span>
            </p>
          </div>
        )}

        <FormInputField
          id="label"
          label="Field Label"
          registration={labelRegistration}
          error={errors.label?.message}
          required
          placeholder="e.g., Team Name"
          helperText="The label shown to registrants on the form."
          disabled={isFullyLocked}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxField
            id="is_required"
            label="Required"
            description="Registrants must answer this question."
            registration={isRequiredRegistration}
            disabled={isStructurallyLocked}
            showLock={isStructurallyLocked}
          />
          <CheckboxField
            id="is_active"
            label="Active"
            description="Show this field on the registration form."
            registration={isActiveRegistration}
            disabled={isStructurallyLocked}
            showLock={isStructurallyLocked}
          />
        </div>
      </div>
    </SectionCard>
  )
}
