import { useState } from 'react';

import { ArrowRight, CheckCircle2, Clock, ExternalLink, Mail } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar, Badge, Button, Skeleton } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  usePublicRecruitmentConfigQuery,
  useRecruitmentApplicationByTokenQuery,
  useUpdateRecruitmentStageMutation,
} from '@/hooks/domain/recruitment';
import { RECRUITMENT_STEPS } from '@/lib/domain/recruitment';
import type {
  ApplicantRecruitmentTimelineItem,
  RecruitmentStepNumber,
} from '@/lib/domain/recruitment';

import { ApplicantCommitmentSelector, RecruitmentTimelineStep } from './components';

function getApplicationStatusVariant(status: string) {
  if (status === 'deployed') return 'default';
  if (status === 'declined' || status === 'withdrawn') return 'destructive';
  if (status === 'on_hold') return 'accent';
  return 'secondary';
}

function getStepStatus(
  stepNumber: RecruitmentStepNumber,
  currentStep: RecruitmentStepNumber,
  targetRole: string,
  transactions: Partial<Record<RecruitmentStepNumber, ApplicantRecruitmentTimelineItem>>,
) {
  if (stepNumber === 1) return 'completed' as const;
  if (stepNumber > currentStep) return 'locked' as const;
  if (stepNumber === 6 && targetRole !== 'Prayer Coach') return 'skipped' as const;
  return transactions[stepNumber]?.status ?? (stepNumber < currentStep ? 'completed' : 'pending');
}

function formatCommitments(commitments: Record<string, string[]>): string[] {
  const labels = [
    ['first_sunday', '1st Sunday'],
    ['second_sunday', '2nd Sunday'],
    ['third_sunday', '3rd Sunday'],
    ['fourth_sunday', '4th Sunday'],
    ['fifth_sunday', '5th Sunday'],
  ] as const;

  return labels.flatMap(([key, label]) =>
    (commitments[key] ?? []).map((slot) => `${label}: ${slot}`),
  );
}

export function RecruitmentProgressPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? null;
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const {
    data: applicationResult,
    isLoading: isApplicationLoading,
    isError: isApplicationError,
    error: applicationError,
  } = useRecruitmentApplicationByTokenQuery(token);
  const { data: config } = usePublicRecruitmentConfigQuery();
  const updateStage = useUpdateRecruitmentStageMutation();

  const runApplicantAction = (
    action: 'complete_vmt' | 'resend_endorsement',
    actionLabel: string,
  ) => {
    if (!applicationResult || applicationResult.expired) return;
    setSelectedAction(action);
    updateStage.mutate(
      {
        action,
        application_id: applicationResult.id,
        token: token ?? undefined,
        override_endorsement_gate: false,
      },
      {
        onSuccess: () => {
          toast.success(
            action === 'complete_vmt'
              ? 'CCF VMT registration confirmed.'
              : 'Endorsement email sent.',
          );
          setSelectedAction(null);
        },
        onError: (error) => {
          toast.error(error.message || `Unable to ${actionLabel.toLowerCase()}.`);
          setSelectedAction(null);
        },
      },
    );
  };

  const saveCommitments = (serviceCommitments: Record<string, string[] | undefined>) => {
    if (!applicationResult || applicationResult.expired) return;
    setSelectedAction('save_commitments');
    updateStage.mutate(
      {
        action: 'save_commitments',
        application_id: applicationResult.id,
        token: token ?? undefined,
        override_endorsement_gate: false,
        service_commitments: serviceCommitments,
      },
      {
        onSuccess: () => {
          toast.success('Sunday commitments saved.');
          setSelectedAction(null);
        },
        onError: (error) => {
          toast.error(error.message || 'Unable to save Sunday commitments.');
          setSelectedAction(null);
        },
      },
    );
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <section className="space-y-5 border-l-4 border-primary bg-surface p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-text">
            <Mail aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text">Application Tracking Link Required</h1>
            <p className="mt-2 text-sm text-muted">
              Please open the personalized application tracking link sent to your registered email
              when you submitted your application.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-4 text-xs text-muted">
            If you did not receive the email or misplaced your tracking link, please contact Welcome
            Center staff or a team reviewer to resend it.
          </div>
        </section>
      </main>
    );
  }

  if (isApplicationLoading) {
    return (
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-80 w-full" />
      </main>
    );
  }

  if (isApplicationError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section
          role="alert"
          className="border border-danger/30 bg-surface p-5 text-sm text-danger"
        >
          {applicationError?.message || 'Unable to load your recruitment application.'}
        </section>
      </main>
    );
  }

  if (!applicationResult) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-text">No application found</h1>
        <p className="text-sm text-muted">
          There is currently no linked application for this tracking link. Please check that you
          used the complete URL from your confirmation email.
        </p>
      </main>
    );
  }

  if (applicationResult.expired) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <section className="space-y-4 border-l-4 border-muted bg-surface p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-text">
            <Clock aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text">Application Link Expired</h1>
            <p className="mt-2 text-sm text-muted">
              {applicationResult.status === 'deployed'
                ? 'Your volunteer recruitment process is complete and you have been deployed!'
                : `This recruitment tracking link is no longer active (status: ${applicationResult.status}). Tracking links expire when an application is completed, archived, or withdrawn.`}
            </p>
          </div>
          {applicationResult.status === 'deployed' && (
            <Link
              to={ROUTE_PATHS.profile}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Open my member profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
        </section>
      </main>
    );
  }

  const application = applicationResult;

  const transactions: Partial<Record<RecruitmentStepNumber, ApplicantRecruitmentTimelineItem>> = {};
  for (const transaction of application.transactions) {
    transactions[transaction.step_number] = transaction;
  }

  const targetRole = application.confirmed_role ?? application.desired_role;
  const progress =
    application.status === 'deployed' ? 100 : Math.round((application.current_step / 9) * 100);
  const commitmentLabels = formatCommitments(application.service_commitments);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
        <Avatar
          avatarObjectKey={application.avatar_object_key}
          name={application.full_name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">{application.full_name}</h1>
            <Badge variant={getApplicationStatusVariant(application.status)}>
              {application.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">Target role: {application.desired_role}</p>
          <div className="mt-4 max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text">
                {application.status === 'deployed'
                  ? 'All 9 steps completed'
                  : `Step ${application.current_step} of 9`}
              </span>
              <span className="rounded-full bg-accent/40 px-2 py-0.5 font-medium text-text">
                {progress}% complete
              </span>
            </div>

            <div
              aria-label={`Overall recruitment progress: ${progress}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="grid grid-cols-9 gap-1.5"
              role="progressbar"
            >
              {RECRUITMENT_STEPS.map((step) => {
                const isStepCompleted =
                  application.status === 'deployed' || step.stepNumber < application.current_step;
                const isStepActive =
                  application.status !== 'deployed' && step.stepNumber === application.current_step;

                let segmentClass = 'border border-border bg-border/40';
                if (isStepCompleted) {
                  segmentClass = 'bg-primary';
                } else if (isStepActive) {
                  segmentClass = 'bg-primary ring-2 ring-primary/30';
                }

                return (
                  <div
                    key={step.stepNumber}
                    title={`Step ${step.stepNumber}: ${step.title}`}
                    className={`h-2.5 rounded-full transition-all ${segmentClass}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {application.status === 'deployed' && (
        <section className="border-l-4 border-primary bg-accent/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-text">
                Welcome to the Welcome Center team
              </h2>
              <p className="text-sm text-text">
                You are deployed as {application.confirmed_role ?? application.desired_role}.
              </p>
              {application.assigned_rfid_member_id && (
                <p className="text-sm text-text">
                  Assigned RFID: {application.assigned_rfid_member_id}
                </p>
              )}
              {commitmentLabels.length > 0 && (
                <p className="text-sm text-text">Sunday schedule: {commitmentLabels.join(', ')}</p>
              )}
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                to={ROUTE_PATHS.profile}
              >
                Open my profile <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="recruitment-timeline-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h2 id="recruitment-timeline-heading" className="text-xl font-semibold text-text">
              Application steps
            </h2>
            <p className="mt-1 text-sm text-muted">
              Your progress through the nine-step recruitment process.
            </p>
          </div>
          <span className="text-sm font-medium text-muted">{progress}% complete</span>
        </div>
        <ol className="relative">
          {RECRUITMENT_STEPS.map((step, index) => {
            const transaction = transactions[step.stepNumber];
            const status = getStepStatus(
              step.stepNumber,
              application.current_step,
              targetRole,
              transactions,
            );
            const statusLabel =
              step.stepNumber === 6 && status === 'skipped'
                ? `Skipped (Not Required for ${targetRole})`
                : undefined;
            const isCompletedStep = status === 'completed';
            const isPathActive =
              application.status === 'deployed' ||
              (isCompletedStep && step.stepNumber < application.current_step) ||
              (status === 'skipped' && step.stepNumber < application.current_step);

            return (
              <RecruitmentTimelineStep
                key={step.stepNumber}
                stepNumber={step.stepNumber}
                title={step.title}
                description={step.description}
                status={status}
                statusLabel={statusLabel}
                transaction={transaction}
                isCurrent={
                  step.stepNumber === application.current_step && application.status !== 'deployed'
                }
                isLast={index === RECRUITMENT_STEPS.length - 1}
                isPathActive={isPathActive}
              >
                {step.stepNumber === 1 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant={
                        application.dgroup_approval_status === 'approved' ||
                        application.dgroup_approval_status === 'rejected'
                          ? 'default'
                          : 'accent'
                      }
                    >
                      {application.dgroup_approval_status === 'approved' ||
                      application.dgroup_approval_status === 'rejected'
                        ? 'Endorsement: Submitted'
                        : 'Endorsement: Pending'}
                    </Badge>
                    {application.dgroup_approval_status === 'pending' &&
                      application.status === 'active' && (
                        <Button
                          disabled={updateStage.isPending}
                          onClick={() =>
                            runApplicantAction('resend_endorsement', 'resend endorsement')
                          }
                          size="sm"
                          variant="outline"
                        >
                          {selectedAction === 'resend_endorsement'
                            ? 'Sending...'
                            : 'Resend Endorsement Email'}
                        </Button>
                      )}
                  </div>
                )}

                {step.stepNumber === 3 && config?.orientation_instructions && (
                  <p className="text-sm text-text">{config.orientation_instructions}</p>
                )}

                {step.stepNumber === 6 && targetRole === 'Prayer Coach' && (
                  <p className="text-sm text-text">
                    Serve one Sunday service as an Usher before Prayer Coach service.
                  </p>
                )}

                {step.stepNumber === 7 && (
                  <div className="flex flex-wrap gap-3">
                    {application.vmt_registered ? (
                      <Badge variant="default">CCF VMT registration confirmed</Badge>
                    ) : (
                      <>
                        {config?.vmt_registration_url && (
                          <a
                            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:bg-background"
                            href={config.vmt_registration_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open CCF VMT Database{' '}
                            <ExternalLink aria-hidden="true" className="h-4 w-4" />
                          </a>
                        )}
                        {application.current_step === 7 && (
                          <Button
                            disabled={updateStage.isPending}
                            onClick={() =>
                              runApplicantAction('complete_vmt', 'confirm registration')
                            }
                            size="sm"
                          >
                            {selectedAction === 'complete_vmt'
                              ? 'Confirming...'
                              : 'I Have Completed CCF VMT Registration'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {step.stepNumber === 8 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">
                      {application.assigned_rfid_member_id
                        ? `RFID card ready: ${application.assigned_rfid_member_id}`
                        : 'Your physical RFID card is not yet ready for release.'}
                    </p>
                    {commitmentLabels.length > 0 && (
                      <p className="text-sm text-text">Selected: {commitmentLabels.join(', ')}</p>
                    )}
                    {application.current_step === 8 && application.status === 'active' && (
                      <ApplicantCommitmentSelector
                        key={`${application.id}-${JSON.stringify(application.service_commitments)}`}
                        commitments={application.service_commitments}
                        isSaving={updateStage.isPending && selectedAction === 'save_commitments'}
                        onSave={saveCommitments}
                      />
                    )}
                  </div>
                )}
              </RecruitmentTimelineStep>
            );
          })}
        </ol>
      </section>
    </main>
  );
}

export default RecruitmentProgressPage;
