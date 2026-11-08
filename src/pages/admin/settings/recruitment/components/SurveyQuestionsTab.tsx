import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller, useFieldArray } from 'react-hook-form';

import { Badge, FormSelectField, FormTextareaField } from '@/components/ui';
import type { RecruitmentSettingsInput } from '@/lib/domain/recruitment';

interface SurveyQuestionsTabProps {
  control: Control<RecruitmentSettingsInput>;
  register: UseFormRegister<RecruitmentSettingsInput>;
  errors: FieldErrors<RecruitmentSettingsInput>;
}

const CORRECT_ANSWER_OPTIONS = [
  { label: 'True', value: 'true' },
  { label: 'False', value: 'false' },
];

export function SurveyQuestionsTab({ control, register, errors }: SurveyQuestionsTabProps) {
  const { fields } = useFieldArray({
    control,
    name: 'survey_questions',
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-heading text-base font-bold text-text">
          20-Question Doctrinal Survey Bank
        </h3>
        <p className="mt-1 text-xs text-muted">
          These True/False statements are presented to candidates in Step 1. They are automatically
          scored to provide a theological discussion guide for the Step 2 Interviewer.
        </p>
      </div>

      {fields.map((fieldItem, index) => {
        const questionErrors = errors.survey_questions?.[index];

        return (
          <div
            key={fieldItem.id}
            className="space-y-4 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Q{index + 1}</Badge>
                <span className="text-xs font-semibold text-muted">
                  Field Key: {fieldItem.field_key}
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  {...register(`survey_questions.${index}.is_active`)}
                />
                Active Question
              </label>
            </div>

            <FormTextareaField
              label={`Statement #${index + 1}`}
              rows={2}
              textareaClassName="resize-none"
              registration={register(`survey_questions.${index}.label`)}
              error={questionErrors?.label?.message}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name={`survey_questions.${index}.correct_answer`}
                control={control}
                render={({ field }) => (
                  <FormSelectField
                    label="Expected Answer"
                    placeholder=""
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    options={CORRECT_ANSWER_OPTIONS}
                    error={questionErrors?.correct_answer?.message}
                  />
                )}
              />

              <FormTextareaField
                label="Interviewer Biblical Guide / Scripture Reference"
                rows={2}
                textareaClassName="resize-none"
                placeholder="e.g. 1 Timothy 2:5, John 10:28–29"
                registration={register(`survey_questions.${index}.explanation`)}
                error={questionErrors?.explanation?.message}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
