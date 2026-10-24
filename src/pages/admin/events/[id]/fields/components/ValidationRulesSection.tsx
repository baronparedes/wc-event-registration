import type { UseFormRegister } from 'react-hook-form';

import { DynamicFieldValidationRulesSection } from '@/components/ui/DynamicFieldValidationRulesSection';
import type { ApproverUserItem } from '@/lib/domain/auth';
import type { EventFieldFormValues } from '@/lib/domain/event-fields';

type ValidationRulesSectionProps = {
  isStructurallyLocked: boolean;
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
  register: UseFormRegister<EventFieldFormValues>;
  uniqueKeyComponentError?: string;
};

/** Section for all validation rule inputs (text, number, date, multi-select, approval). */
export function ValidationRulesSection({
  isStructurallyLocked,
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
      showApprovalValidation={showApprovalValidation}
      approverEmail={approverEmail}
      onApproverChange={onApproverChange}
      disabledApproverEmails={disabledApproverEmails}
      approverError={approverError}
      disabled={isStructurallyLocked}
      register={register}
      allowUniqueMatching={true}
      uniqueKeyComponentError={uniqueKeyComponentError}
      allowDateExtraRules={true}
    />
  );
}
