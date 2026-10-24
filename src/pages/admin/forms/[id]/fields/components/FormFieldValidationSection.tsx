import type { UseFormRegister } from 'react-hook-form';

import { DynamicFieldValidationRulesSection } from '@/components/ui/DynamicFieldValidationRulesSection';
import type { ApproverUserItem } from '@/lib/domain/auth';
import type { FormFieldFormValues } from '@/lib/domain/forms';

type FormFieldValidationSectionProps = {
  showTextValidation: boolean;
  showNumberValidation: boolean;
  showRatingValidation: boolean;
  showMultiSelectValidation: boolean;
  showDateValidation: boolean;
  showApprovalValidation?: boolean;
  approverEmail?: string;
  onApproverChange?: (approver: ApproverUserItem | null) => void;
  disabledApproverEmails?: string[];
  approverError?: string;
  disabled?: boolean;
  register: UseFormRegister<FormFieldFormValues>;
};

/** Section for validation rule inputs (text, number, rating, date, multi-select, approval). */
export function FormFieldValidationSection({
  showTextValidation,
  showNumberValidation,
  showRatingValidation,
  showMultiSelectValidation,
  showDateValidation,
  showApprovalValidation,
  approverEmail,
  onApproverChange,
  disabledApproverEmails,
  approverError,
  disabled = false,
  register,
}: FormFieldValidationSectionProps) {
  return (
    <DynamicFieldValidationRulesSection
      showTextValidation={showTextValidation}
      showNumberValidation={showNumberValidation}
      showRatingValidation={showRatingValidation}
      showMultiSelectValidation={showMultiSelectValidation}
      showDateValidation={showDateValidation}
      showApprovalValidation={showApprovalValidation}
      approverEmail={approverEmail}
      onApproverChange={onApproverChange}
      disabledApproverEmails={disabledApproverEmails}
      approverError={approverError}
      disabled={disabled}
      register={register}
    />
  );
}
