import type { UseFormRegisterReturn } from 'react-hook-form';

import { CheckboxField, FormInputField, SectionCard } from '@/components/ui';
import { FormSelectField } from '@/components/ui/FormSelectField';
import type { FormField, FormFieldApplicability } from '@/lib/domain/forms';

type FormFieldDetailsSectionProps = {
  isEditing: boolean;
  field: FormField | null;
  fieldKeyRegistration: UseFormRegisterReturn;
  labelRegistration: UseFormRegisterReturn;
  applicabilityRegistration: UseFormRegisterReturn;
  applicabilityValue: FormFieldApplicability;
  isRequiredRegistration: UseFormRegisterReturn;
  isActiveRegistration: UseFormRegisterReturn;
  errors: {
    field_key?: { message?: string };
    label?: { message?: string };
    field_applicability?: { message?: string };
  };
};

const APPLICABILITY_OPTIONS = [
  { value: 'all', label: 'All Respondents' },
  { value: 'member_only', label: 'Members Only' },
  { value: 'public_only', label: 'Public Only' },
] as const;

/** Section for field name, label, applicability, and required/active checkboxes. */
export function FormFieldDetailsSection({
  isEditing,
  field,
  fieldKeyRegistration,
  labelRegistration,
  applicabilityRegistration,
  applicabilityValue,
  isRequiredRegistration,
  isActiveRegistration,
  errors,
}: FormFieldDetailsSectionProps) {
  return (
    <SectionCard title="Field Details">
      <div className="space-y-4">
        {/* Field key — create mode only; read-only in edit mode */}
        {!isEditing ? (
          <FormInputField
            id="field_key"
            label="Field Key"
            registration={fieldKeyRegistration}
            error={errors.field_key?.message}
            required
            placeholder="e.g., preferred_date"
            helperText="Unique identifier used internally. Lowercase letters, numbers, and underscores only. Cannot be changed after creation."
          />
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-text">Field Key</p>
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
          placeholder="e.g., Preferred Date"
          helperText="The label shown to respondents on the form."
        />

        <FormSelectField
          id="field_applicability"
          label="Audience"
          registration={applicabilityRegistration}
          value={applicabilityValue}
          options={[...APPLICABILITY_OPTIONS]}
          error={errors.field_applicability?.message ?? null}
          helperText="Choose whether this field is shown to all respondents, members only, or public only."
          required
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxField
            id="is_required"
            label="Required"
            description="Respondents must answer this question."
            registration={isRequiredRegistration}
          />
          <CheckboxField
            id="is_active"
            label="Active"
            description="Show this field on the form."
            registration={isActiveRegistration}
          />
        </div>
      </div>
    </SectionCard>
  );
}
