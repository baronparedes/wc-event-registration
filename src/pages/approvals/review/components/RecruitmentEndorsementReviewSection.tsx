import type { ChangeEvent } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { DynamicFieldRenderer } from '@/components/fields';
import { Avatar, Badge, Button, FormTextareaField } from '@/components/ui';
import {
  type DynamicFieldResponseValues,
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  formatAnswerValue,
} from '@/lib/domain/dynamic-fields';
import { filterVisibleFieldValues, isFieldVisible } from '@/lib/domain/field-visibility';
import {
  type RecruitmentEndorsementReviewDetails,
  recruitmentEndorsementReviewDetailsSchema,
} from '@/lib/domain/recruitment';

type RecruitmentEndorsementReviewSectionProps = {
  entityDetails: Record<string, unknown>;
  canDecide: boolean;
  isSubmitting: boolean;
  decisionNotes: string;
  onDecisionNotesChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDecision: (decision: 'approved' | 'rejected', answers: Record<string, unknown>) => void;
};

const responseRecordSchema = z.record(z.string(), z.unknown());

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function displayAnswer(
  question: RecruitmentEndorsementReviewDetails['endorsement_questions'][number],
  value: unknown,
) {
  return formatAnswerValue(
    question.field_type,
    { answer_json: value },
    { options: question.options, rules: question.validation_rules },
  );
}

export function RecruitmentEndorsementReviewSection({
  entityDetails,
  ...props
}: RecruitmentEndorsementReviewSectionProps) {
  const parsedDetails = recruitmentEndorsementReviewDetailsSchema.safeParse(entityDetails);
  if (!parsedDetails.success) {
    return (
      <div role="alert" className="mt-4 border border-danger/30 bg-surface p-4 text-sm text-danger">
        Endorsement details are invalid or unavailable.
      </div>
    );
  }

  return <RecruitmentEndorsementReviewForm details={parsedDetails.data} {...props} />;
}

function RecruitmentEndorsementReviewForm({
  details,
  canDecide,
  isSubmitting,
  decisionNotes,
  onDecisionNotesChange,
  onDecision,
}: Omit<RecruitmentEndorsementReviewSectionProps, 'entityDetails'> & {
  details: RecruitmentEndorsementReviewDetails;
}) {
  const questions = details.endorsement_questions
    .filter((question) => question.is_active !== false)
    .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0));
  const form = useForm<DynamicFieldResponseValues>({
    resolver: zodResolver(responseRecordSchema),
    defaultValues: {
      ...createDynamicFieldDefaultValues(questions),
      ...details.attestation_answers,
    },
  });
  const values = useWatch({ control: form.control }) ?? {};
  const visibleQuestions = questions.filter((question) =>
    isFieldVisible(question, questions, values),
  );

  const submitDecision = (decision: 'approved' | 'rejected') => {
    form.clearErrors();
    void form.handleSubmit((formValues) => {
      const visibleValues = filterVisibleFieldValues(visibleQuestions, formValues);
      const result = buildDynamicFieldResponseSchema(visibleQuestions).safeParse(visibleValues);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const fieldKey = issue.path[0];
          if (typeof fieldKey === 'string') {
            form.setError(fieldKey, { type: 'validate', message: issue.message });
          }
        }
        return;
      }

      onDecision(decision, result.data);
    })();
  };

  return (
    <section className="mt-4 space-y-5 border-t border-border pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={details.full_name} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-text">{details.full_name}</h2>
          <p className="text-sm text-muted">Applied {formatCreatedAt(details.created_at)}</p>
        </div>
        <Badge variant="secondary">{details.desired_role}</Badge>
      </div>

      {canDecide ? (
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <div className="space-y-5">
            {visibleQuestions.map((question) => {
              const error = form.formState.errors[question.field_key]?.message;
              return (
                <div key={question.field_key} className="space-y-1.5">
                  <label
                    className="block text-sm font-medium text-text"
                    htmlFor={`field-${question.field_key}`}
                  >
                    {question.label}
                    {question.is_required && <span className="text-danger"> *</span>}
                  </label>
                  {question.help_text && <p className="text-xs text-muted">{question.help_text}</p>}
                  <DynamicFieldRenderer field={question} dynamicForm={form} />
                  {error && <p className="text-sm text-danger">{String(error)}</p>}
                </div>
              );
            })}
          </div>

          <FormTextareaField
            id="endorsement-decision-notes"
            label="Notes / Feedback for Applicant"
            value={decisionNotes}
            onChange={onDecisionNotesChange}
            rows={3}
            textareaClassName="resize-none"
            helperText="A note is required when declining an applicant."
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={isSubmitting}
              onClick={() => submitDecision('rejected')}
              variant="destructive"
            >
              <XCircle aria-hidden="true" className="h-4 w-4" />
              Decline
            </Button>
            <Button disabled={isSubmitting} onClick={() => submitDecision('approved')}>
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Endorse Applicant
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text">DGroup Leader Attestation</h3>
          {questions.map((question) => (
            <div key={question.field_key} className="border-b border-border py-3 last:border-0">
              <p className="text-xs font-medium text-muted">{question.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                {displayAnswer(question, details.attestation_answers[question.field_key])}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
