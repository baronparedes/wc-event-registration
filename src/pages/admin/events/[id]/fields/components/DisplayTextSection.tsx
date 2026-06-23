import type { UseFormRegisterReturn } from 'react-hook-form'
import { SectionCard } from '@/components/ui/SectionCard'
import { FormInputField } from '@/components/ui/FormInputField'
import { FormTextareaField } from '@/components/ui/FormTextareaField'

type DisplayTextSectionProps = {
  isFullyLocked: boolean
  placeholderRegistration: UseFormRegisterReturn
  helpTextRegistration: UseFormRegisterReturn
  errors: {
    placeholder?: { message?: string }
    help_text?: { message?: string }
  }
}

/** Section for placeholder and help text. */
export function DisplayTextSection({
  isFullyLocked,
  placeholderRegistration,
  helpTextRegistration,
  errors,
}: DisplayTextSectionProps) {
  return (
    <SectionCard title="Display Text">
      <div className="space-y-4">
        <FormInputField
          id="placeholder"
          label="Placeholder"
          registration={placeholderRegistration}
          error={errors.placeholder?.message}
          placeholder="e.g., Enter your answer here"
          helperText="Hint text shown inside the input before the registrant types."
          disabled={isFullyLocked}
        />
        <FormTextareaField
          id="help_text"
          label="Help Text"
          registration={helpTextRegistration}
          error={errors.help_text?.message}
          placeholder="e.g., Please enter your full team name as it appears on your registration."
          helperText="Additional guidance shown below the input."
          rows={2}
          disabled={isFullyLocked}
        />
      </div>
    </SectionCard>
  )
}
