import type { UseFormRegisterReturn } from 'react-hook-form';

import { FormInputField } from '@/components/ui/FormInputField';
import { FormTextareaField } from '@/components/ui/FormTextareaField';
import { SectionCard } from '@/components/ui/SectionCard';

type FormFieldDisplayTextSectionProps = {
  placeholderRegistration: UseFormRegisterReturn;
  helpTextRegistration: UseFormRegisterReturn;
  errors: {
    placeholder?: { message?: string };
    help_text?: { message?: string };
  };
};

/** Section for placeholder and help text. */
export function FormFieldDisplayTextSection({
  placeholderRegistration,
  helpTextRegistration,
  errors,
}: FormFieldDisplayTextSectionProps) {
  return (
    <SectionCard title="Display Text">
      <div className="space-y-4">
        <FormInputField
          id="placeholder"
          label="Placeholder"
          registration={placeholderRegistration}
          error={errors.placeholder?.message}
          placeholder="e.g., Enter your answer here"
          helperText="Hint text shown inside the input before the respondent types."
        />
        <FormTextareaField
          id="help_text"
          label="Help Text"
          registration={helpTextRegistration}
          error={errors.help_text?.message}
          placeholder="e.g., Please enter your full preferred name."
          helperText="Additional guidance shown below the input."
          rows={2}
        />
      </div>
    </SectionCard>
  );
}
