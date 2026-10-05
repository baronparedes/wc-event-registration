import type { UseFormRegister } from 'react-hook-form';

import { DynamicFieldValidationRulesSection } from '@/components/ui/DynamicFieldValidationRulesSection';
import type { EventFieldFormValues } from '@/lib/domain/event-fields';

type ValidationRulesSectionProps = {
  isStructurallyLocked: boolean;
  showTextValidation: boolean;
  showNumberValidation: boolean;
  showRatingValidation: boolean;
  showMultiSelectValidation: boolean;
  showDateValidation: boolean;
  register: UseFormRegister<EventFieldFormValues>;
  uniqueKeyComponentError?: string;
};

/** Section for all validation rule inputs (text, number, date, multi-select). */
export function ValidationRulesSection({
  isStructurallyLocked,
  showTextValidation,
  showNumberValidation,
  showRatingValidation,
  showMultiSelectValidation,
  showDateValidation,
  register,
  uniqueKeyComponentError,
}: ValidationRulesSectionProps) {
  return (
    <DynamicFieldValidationRulesSection
      showTextValidation={showTextValidation}
      showNumberValidation={showNumberValidation}
      showRatingValidation={showRatingValidation}
      showMultiSelectValidation={showMultiSelectValidation}
      showDateValidation={showDateValidation}
      disabled={isStructurallyLocked}
      register={register}
      allowUniqueMatching={true}
      uniqueKeyComponentError={uniqueKeyComponentError}
      allowDateExtraRules={true}
    />
  );
}
