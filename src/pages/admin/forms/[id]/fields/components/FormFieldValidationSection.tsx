import type { UseFormRegister } from 'react-hook-form';

import { DynamicFieldValidationRulesSection } from '@/components/ui/DynamicFieldValidationRulesSection';
import type { FormFieldFormValues } from '@/lib/domain/forms';

type FormFieldValidationSectionProps = {
  showTextValidation: boolean;
  showNumberValidation: boolean;
  showRatingValidation: boolean;
  showMultiSelectValidation: boolean;
  showDateValidation: boolean;
  register: UseFormRegister<FormFieldFormValues>;
};

/** Section for validation rule inputs (text, number, rating, date, multi-select). */
export function FormFieldValidationSection({
  showTextValidation,
  showNumberValidation,
  showRatingValidation,
  showMultiSelectValidation,
  showDateValidation,
  register,
}: FormFieldValidationSectionProps) {
  return (
    <DynamicFieldValidationRulesSection
      showTextValidation={showTextValidation}
      showNumberValidation={showNumberValidation}
      showRatingValidation={showRatingValidation}
      showMultiSelectValidation={showMultiSelectValidation}
      showDateValidation={showDateValidation}
      register={register}
    />
  );
}
