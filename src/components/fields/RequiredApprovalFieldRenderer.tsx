import { useEffect } from 'react';

import { ShieldCheck } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

type RequiredApprovalFieldRendererProps = {
  field: DynamicFieldLike;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
};

export function RequiredApprovalFieldRenderer({
  field,
  dynamicForm,
}: RequiredApprovalFieldRendererProps) {
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const approverName = typeof rules.approver_name === 'string' ? rules.approver_name : null;

  useEffect(() => {
    // Ensure the response value has a valid default placeholder indicating pending approval
    const currentValue = dynamicForm.getValues(field.field_key);
    if (!currentValue) {
      dynamicForm.setValue(field.field_key, 'pending_approval', {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [dynamicForm, field.field_key]);

  return (
    <div
      className="flex items-start gap-3.5 rounded-lg border border-amber-300 bg-amber-50/80 p-4 text-amber-950 transition-colors"
      role="status"
      aria-label="Approval Notice"
    >
      <input type="hidden" {...dynamicForm.register(field.field_key)} value="pending_approval" />
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-amber-800">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-amber-950">{field.label || 'Approval Required'}</p>
        <p className="text-amber-900/90 leading-relaxed text-xs sm:text-sm">
          {field.help_text ||
            'Submissions for this form require administrator review before they are finalized. You will be notified once your submission is reviewed.'}
        </p>
        {approverName && (
          <p className="pt-1 text-xs font-medium text-amber-950">
            Designated Reviewer: <span className="font-semibold">{approverName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
