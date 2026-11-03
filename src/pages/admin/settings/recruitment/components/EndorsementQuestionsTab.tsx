import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from 'react-hook-form';

import { Badge, FormInputField, FormTextareaField } from '@/components/ui';
import type { RecruitmentSettingsInput } from '@/lib/domain/recruitment';

interface EndorsementQuestionsTabProps {
  control: Control<RecruitmentSettingsInput>;
  register: UseFormRegister<RecruitmentSettingsInput>;
  errors: FieldErrors<RecruitmentSettingsInput>;
}

export function EndorsementQuestionsTab({
  control,
  register,
  errors,
}: EndorsementQuestionsTabProps) {
  const { fields } = useFieldArray({
    control,
    name: 'endorsement_questions',
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-heading text-base font-bold text-text">
          25-Field DGroup Leader Attestation & Endorsement Prompts
        </h3>
        <p className="mt-1 text-xs text-muted">
          These dynamic fields are rendered in the magic-link review flow (/approvals/review/:token)
          sent to the applicant&apos;s DGroup Leader.
        </p>
      </div>

      {fields.map((fieldItem, index) => {
        const questionErrors = errors.endorsement_questions?.[index];

        return (
          <div
            key={fieldItem.id}
            className="space-y-4 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{index + 1}</Badge>
                <span className="font-mono text-xs font-semibold text-text">
                  {fieldItem.field_key}
                </span>
                <Badge variant="secondary" className="uppercase">
                  {fieldItem.field_type}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-text">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    {...register(`endorsement_questions.${index}.is_required`)}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-text">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    {...register(`endorsement_questions.${index}.is_active`)}
                  />
                  Active
                </label>
              </div>
            </div>

            <FormTextareaField
              label="Question Prompt / Field Label"
              rows={2}
              textareaClassName="resize-none"
              registration={register(`endorsement_questions.${index}.label`)}
              error={questionErrors?.label?.message}
            />

            <FormInputField
              label="Help Text (Optional)"
              placeholder="e.g. Kindly check all that is appropriate..."
              registration={register(`endorsement_questions.${index}.help_text`)}
              error={questionErrors?.help_text?.message}
            />
          </div>
        );
      })}
    </div>
  );
}
