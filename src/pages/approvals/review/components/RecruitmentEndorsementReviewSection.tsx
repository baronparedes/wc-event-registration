import { type ChangeEvent, type ReactNode, useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  ShieldAlert,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DynamicFieldRenderer } from '@/components/fields';
import {
  Avatar,
  Badge,
  Button,
  FormTextareaField,
  MarkdownRenderer,
  SectionCard,
  StepIndicator,
  WizardStep,
} from '@/components/ui';
import { useWizardStepScroll } from '@/hooks/utils';
import {
  type DynamicFieldResponseValues,
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  formatAnswerValue,
  parseRatingLabels,
} from '@/lib/domain/dynamic-fields';
import { filterVisibleFieldValues, isFieldVisible } from '@/lib/domain/field-visibility';
import {
  type RecruitmentEndorsementReviewDetails,
  recruitmentEndorsementReviewDetailsSchema,
} from '@/lib/domain/recruitment';
import { fromMonthInput, toMonthInput } from '@/pages/recruitment/apply/utils';

type RecruitmentEndorsementReviewSectionProps = {
  entityDetails: Record<string, unknown>;
  canDecide: boolean;
  isSubmitting: boolean;
  decisionNotes: string;
  onDecisionNotesChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDecision: (decision: 'approved' | 'rejected', answers: Record<string, unknown>) => void;
};

type ThematicGroup = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  match: (fieldKey: string) => boolean;
};

const THEMATIC_GROUPS: ThematicGroup[] = [
  {
    id: 'dgroup_relationship',
    title: 'Leader & DGroup Relationship',
    description: 'Verify your disciple-maker relationship and involvement in your DGroup.',
    icon: <HeartHandshake className="h-4 w-4 text-primary" />,
    match: (key) =>
      [
        'leader_full_name',
        'disciple_dgroup_since',
        'is_disciple_dgroup_leader',
        'disciple_led_dgroup_since',
      ].includes(key),
  },
  {
    id: 'spiritual_character',
    title: 'Spiritual Maturity & Character Evaluation',
    description: 'Evaluate spiritual disciplines, private life, and walk with God.',
    icon: <BookOpen className="h-4 w-4 text-primary" />,
    match: (key) => key.startsWith('eval_'),
  },
  {
    id: 'growth_assessment',
    title: 'Disciple Growth & Assessment',
    description: 'Share observed strengths, weaknesses, and areas for improvement.',
    icon: <ClipboardCheck className="h-4 w-4 text-primary" />,
    match: (key) =>
      ['disciple_strengths', 'disciple_weaknesses', 'disciple_improvements'].includes(key),
  },
  {
    id: 'credibility_concerns',
    title: 'Ministry Credibility & Concerns',
    description: 'Disclose any potential concerns that may impact their ministry role.',
    icon: <ShieldAlert className="h-4 w-4 text-primary" />,
    match: (key) => ['credibility_concerns', 'credibility_concerns_details'].includes(key),
  },
  {
    id: 'recommendation_attestation',
    title: 'Attestation & Recommendation',
    description: 'Formal ministry recommendation and leader attestation commitment.',
    icon: <UserCheck className="h-4 w-4 text-primary" />,
    match: (key) =>
      [
        'recommendation_decision',
        'recommendation_comments',
        'leader_attestation_statement',
        'attestation_comments',
      ].includes(key),
  },
];

const LEADER_ATTESTATION_MARKDOWN = `# The following statements are for your disciple

**Is a committed member of my DGroup.**

1. Saved by grace through faith in Jesus and experiencing life transformation.
2. Pursues spiritual disciplines such as consistent prayer and quiet time.
3. Does his/her best to honor God through a daily lifestyle that is above reproach and does not indulge in worldly pleasures or gossip.
4. Practices sexual purity and forgiveness.
5. Not involved in a romantic relationship with an unbeliever.
6. Manages his/her finances well by minimizing debt and tithing regularly.
7. Does his/her best to live a life of integrity in public, private, and social media.
8. Has a teachable and humble heart, open to accountability and correction by his/her DGroup and ministry leader.
9. Wants to be used by God to disciple others and help to disciple others.
10. Finished GLC 1 and attended a True Life Retreat. If he/she has not attended True Life yet, He/she commits to attend True Life within the year and allows his/her Dleader or District Head to monitor his/her progress.
11. Knows by heart CCF’s mission and vision.

I commit to supporting my disciple by regularly praying for, mentoring, and checking up on him/her as he/she volunteers in the Welcome Center throughout the year. I also consent to be contacted by the Welcome Center leadership to discuss the growth and walk of my disciple as the need arises throughout the volunteer period.`;

const responseRecordSchema = z.record(z.string(), z.unknown());

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function displayAnswer(
  question: RecruitmentEndorsementReviewDetails['endorsement_questions'][number],
  value: unknown,
) {
  if (question.field_type === 'rating' && value != null && value !== '') {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(numeric) && numeric > 0) {
      const labels = parseRatingLabels(question.help_text);
      const meaning = labels[numeric];
      const rules = (question.validation_rules ?? {}) as Record<string, unknown>;
      const max = typeof rules.max === 'number' ? rules.max : 3;
      const stars = '★'.repeat(numeric) + '☆'.repeat(Math.max(0, max - numeric));
      if (meaning) {
        return `${stars} (${numeric}) — ${meaning}`;
      }
      return `${stars} (${numeric})`;
    }
  }

  return formatAnswerValue(
    question.field_type,
    { answer_json: value },
    { options: question.options, rules: question.validation_rules },
  );
}

function groupQuestions(questions: RecruitmentEndorsementReviewDetails['endorsement_questions']) {
  const groups: Array<{
    group: ThematicGroup;
    questions: RecruitmentEndorsementReviewDetails['endorsement_questions'];
  }> = [];
  const assignedKeys = new Set<string>();

  for (const group of THEMATIC_GROUPS) {
    const matching = questions.filter((q) => group.match(q.field_key));
    if (matching.length > 0) {
      groups.push({ group, questions: matching });
      matching.forEach((q) => assignedKeys.add(q.field_key));
    }
  }

  const unassigned = questions.filter((q) => !assignedKeys.has(q.field_key));
  if (unassigned.length > 0) {
    groups.push({
      group: {
        id: 'general',
        title: 'General Questions',
        description: 'Additional questionnaire fields.',
        icon: <ClipboardCheck className="h-4 w-4 text-primary" />,
        match: () => true,
      },
      questions: unassigned,
    });
  }

  return groups;
}

function RatingScaleLegend() {
  return (
    <div className="mb-4 rounded-xl border border-border bg-background p-3.5 text-xs text-muted">
      <div className="mb-2 font-semibold text-text">Rating Scale Legend (Scores 1 to 3):</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface px-3 py-2">
          <span className="font-bold text-amber-500">★ 1:</span>
          <span className="font-medium text-text">Not Observed</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface px-3 py-2">
          <span className="font-bold text-amber-500">★★ 2:</span>
          <span className="font-medium text-text">Observed Some of the time</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface px-3 py-2">
          <span className="font-bold text-amber-500">★★★ 3:</span>
          <span className="font-medium text-text">Observed Most of the time</span>
        </div>
      </div>
    </div>
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
  const [activeStep, setActiveStep] = useState<number>(1);
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  const stepThreeRef = useRef<HTMLDivElement | null>(null);

  useWizardStepScroll(activeStep, [stepOneRef, stepTwoRef, stepThreeRef]);

  const questions = useMemo(
    () =>
      details.endorsement_questions
        .filter((question) => question.is_active !== false)
        .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0)),
    [details.endorsement_questions],
  );

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

  const groupedQuestions = useMemo(() => groupQuestions(questions), [questions]);

  const isMonthYearField = (q: (typeof questions)[number]) => {
    if (q.field_key === 'disciple_dgroup_since' || q.field_key === 'disciple_led_dgroup_since') {
      return true;
    }
    const pattern = (q.validation_rules as Record<string, unknown> | undefined)?.pattern;
    return typeof pattern === 'string' && pattern.includes('Jan|Feb|Mar');
  };

  const validateVisibleAnswers = (): Record<string, unknown> | null => {
    form.clearErrors();
    const visibleValues = filterVisibleFieldValues(visibleQuestions, form.getValues());
    // Normalize any month-year string values to Title Case (e.g. 2025 JAN -> 2025 Jan)
    for (const key of Object.keys(visibleValues)) {
      const val = visibleValues[key];
      if (typeof val === 'string') {
        const monthInput = toMonthInput(val);
        if (monthInput) {
          const formatted = fromMonthInput(monthInput);
          if (formatted) {
            visibleValues[key] = formatted;
            form.setValue(key, formatted, { shouldValidate: false });
          }
        }
      }
    }
    const result = buildDynamicFieldResponseSchema(visibleQuestions).safeParse(visibleValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldKey = issue.path[0];
        if (typeof fieldKey === 'string') {
          form.setError(fieldKey, { type: 'validate', message: issue.message });
        }
      }
      return null;
    }
    return result.data;
  };

  const handleContinueToStep3 = () => {
    const valid = validateVisibleAnswers();
    if (valid) {
      setActiveStep(3);
    }
  };

  const handleDecisionSubmit = (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !decisionNotes.trim()) {
      toast.error('Please provide a reason or note when declining an applicant.');
      return;
    }

    const answers = validateVisibleAnswers();
    if (!answers && decision === 'approved') {
      setActiveStep(2);
      return;
    }

    onDecision(decision, answers ?? filterVisibleFieldValues(visibleQuestions, form.getValues()));
  };

  if (!canDecide) {
    return (
      <div className="space-y-6">
        <SectionCard title="Applicant Profile">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={details.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold text-text">{details.full_name}</div>
              {details.nickname && (
                <div className="text-sm text-muted">Nickname: {details.nickname}</div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{details.desired_role}</Badge>
                <span className="text-xs text-muted">
                  Applied {formatCreatedAt(details.created_at)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <h3 className="font-heading text-lg font-semibold text-text">
            DGroup Leader Attestation
          </h3>
          {groupedQuestions.map(({ group, questions: grpQuestions }) => (
            <SectionCard
              key={group.id}
              title={
                <div className="flex items-center gap-2">
                  {group.icon}
                  <span>{group.title}</span>
                </div>
              }
              subtitle={group.description}
            >
              {group.id === 'spiritual_character' && <RatingScaleLegend />}
              <div className="divide-y divide-border">
                {grpQuestions.map((question) => {
                  if (question.field_key === 'leader_attestation_statement') {
                    const answer = details.attestation_answers[question.field_key];
                    const isAttested = answer === 'I attest';
                    return (
                      <div key={question.field_key} className="py-3 first:pt-0 last:pb-0">
                        <div className="overflow-hidden rounded-xl border border-border bg-surface">
                          <div className="bg-background p-4 sm:p-6">
                            <MarkdownRenderer content={LEADER_ATTESTATION_MARKDOWN} />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:px-6">
                            <span className="text-xs font-semibold text-text">
                              Leader Attestation Commitment:
                            </span>
                            <Badge variant={isAttested ? 'default' : 'destructive'}>
                              {String(answer || '—')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={question.field_key} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-xs font-medium text-muted">{question.label}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                        {displayAnswer(question, details.attestation_answers[question.field_key]) ||
                          '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator
        currentStep={activeStep}
        totalSteps={3}
        labels={['Applicant', 'Attestation', 'Decision']}
        categoryLabel="Endorsement Review"
      />

      {activeStep === 1 && (
        <WizardStep
          title="Applicant Overview"
          subtitle="Review the disciple's application details before completing the endorsement."
        >
          <div ref={stepOneRef} className="space-y-6">
            <SectionCard title="Applicant Profile">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={details.full_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-bold text-text">{details.full_name}</div>
                  {details.nickname && (
                    <div className="text-sm text-muted">Nickname: {details.nickname}</div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{details.desired_role}</Badge>
                    <span className="text-xs text-muted">
                      Applied {formatCreatedAt(details.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Welcome Center Volunteer Ministry"
              subtitle="DGroup Leader Endorsement Context"
            >
              <p className="text-sm leading-relaxed text-muted">
                Your disciple has applied to serve as a volunteer in the Welcome Center ministry as{' '}
                <strong className="text-text">{details.desired_role}</strong>. As their DGroup
                Leader, your firsthand observations regarding their spiritual walk, character, and
                readiness help ensure thoughtful placement and volunteer care.
              </p>
            </SectionCard>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setActiveStep(2)} className="w-full sm:w-auto">
                Continue to Attestation <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </WizardStep>
      )}

      {activeStep === 2 && (
        <WizardStep
          title="Leader Attestation Questionnaire"
          subtitle="Please complete each section of the attestation questionnaire based on your discipleship observations."
        >
          <div ref={stepTwoRef} className="space-y-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {groupedQuestions.map(({ group, questions: grpQuestions }) => {
                const visibleGrpQuestions = grpQuestions.filter((q) =>
                  visibleQuestions.some((vq) => vq.field_key === q.field_key),
                );
                if (visibleGrpQuestions.length === 0) return null;

                return (
                  <SectionCard
                    key={group.id}
                    title={
                      <div className="flex items-center gap-2">
                        {group.icon}
                        <span>{group.title}</span>
                      </div>
                    }
                    subtitle={group.description}
                  >
                    {group.id === 'spiritual_character' && <RatingScaleLegend />}
                    <div className="space-y-5">
                      {visibleGrpQuestions.map((question) => {
                        const error = form.formState.errors[question.field_key]?.message;

                        if (question.field_key === 'leader_attestation_statement') {
                          return (
                            <div
                              key={question.field_key}
                              className={`overflow-hidden rounded-xl border bg-surface transition-all ${
                                error ? 'border-danger ring-1 ring-danger/30' : 'border-border'
                              }`}
                            >
                              <div className="bg-background p-4 sm:p-6">
                                <MarkdownRenderer content={LEADER_ATTESTATION_MARKDOWN} />
                              </div>

                              <div className="border-t border-border bg-surface p-4 sm:p-5">
                                <div className="mb-3 space-y-0.5">
                                  <label
                                    className="block text-sm font-semibold text-text"
                                    htmlFor={`field-${question.field_key}`}
                                  >
                                    As their DGroup Leader, do you attest to the statements above?
                                    {question.is_required && (
                                      <span className="text-danger"> *</span>
                                    )}
                                  </label>
                                  <p className="text-xs text-muted">
                                    Please select your attestation commitment before continuing to
                                    the decision.
                                  </p>
                                </div>

                                <DynamicFieldRenderer
                                  field={question}
                                  dynamicForm={form}
                                  radioOptionsLayout="responsive-row"
                                />

                                {error && (
                                  <p className="mt-2 text-sm text-danger">{String(error)}</p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={question.field_key} className="space-y-1.5">
                            <label
                              className="block text-sm font-medium text-text"
                              htmlFor={`field-${question.field_key}`}
                            >
                              {question.label}
                              {question.is_required && <span className="text-danger"> *</span>}
                            </label>
                            {question.help_text && question.field_type !== 'rating' && (
                              <p className="text-xs text-muted">{question.help_text}</p>
                            )}
                            {isMonthYearField(question) ? (
                              <Controller
                                control={form.control}
                                name={question.field_key}
                                render={({ field }) => (
                                  <input
                                    id={`field-${question.field_key}`}
                                    type="month"
                                    className={`block w-full rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 text-text focus:outline-none focus:ring-2 ${
                                      error
                                        ? 'border-danger focus:ring-danger/30'
                                        : 'border-border focus:border-primary focus:ring-primary/30'
                                    }`}
                                    value={toMonthInput(
                                      typeof field.value === 'string' ? field.value : undefined,
                                    )}
                                    onBlur={field.onBlur}
                                    onChange={(event) => {
                                      const val = fromMonthInput(event.target.value);
                                      field.onChange(question.is_required ? val : val || null);
                                    }}
                                    ref={field.ref}
                                  />
                                )}
                              />
                            ) : (
                              <DynamicFieldRenderer
                                field={question}
                                dynamicForm={form}
                                showRatingText={false}
                              />
                            )}
                            {error && <p className="text-sm text-danger">{String(error)}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                );
              })}
            </form>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep(1)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Overview
              </Button>
              <Button type="button" onClick={handleContinueToStep3} className="w-full sm:w-auto">
                Continue to Decision <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </WizardStep>
      )}

      {activeStep === 3 && (
        <WizardStep
          title="Endorsement Decision"
          subtitle="Review your recommendation and submit your endorsement decision."
        >
          <div ref={stepThreeRef} className="space-y-6">
            <SectionCard title="Recommendation Summary">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted">Applicant</div>
                  <div className="text-sm font-semibold text-text">{details.full_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Desired Role</div>
                  <div className="text-sm font-semibold text-text">{details.desired_role}</div>
                </div>
                {Boolean(values.recommendation_decision) && (
                  <div>
                    <div className="text-xs text-muted">Recommendation</div>
                    <div className="text-sm font-semibold text-text">
                      {String(values.recommendation_decision)}
                    </div>
                  </div>
                )}
                {Boolean(values.leader_attestation_statement) && (
                  <div>
                    <div className="text-xs text-muted">Attestation Commitment</div>
                    <div className="text-sm font-semibold text-text">
                      {String(values.leader_attestation_statement)}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Notes & Feedback"
              subtitle="Optional for endorsement, required if declining."
            >
              <FormTextareaField
                id="endorsement-decision-notes"
                label="Notes / Feedback for Applicant"
                value={decisionNotes}
                onChange={onDecisionNotesChange}
                rows={3}
                textareaClassName="resize-none"
                placeholder="e.g. Strongly recommended. Diligent and consistent in spiritual growth."
                helperText="A note is required when declining an applicant."
                disabled={isSubmitting}
              />
            </SectionCard>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setActiveStep(2)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Attestation
              </Button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleDecisionSubmit('rejected')}
                  className="w-full sm:w-auto border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? 'Declining...' : 'Decline'}
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDecisionSubmit('approved')}
                  className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? 'Endorsing...' : 'Endorse Applicant'}
                </Button>
              </div>
            </div>
          </div>
        </WizardStep>
      )}
    </div>
  );
}
