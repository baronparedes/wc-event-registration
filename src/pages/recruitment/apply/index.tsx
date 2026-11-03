import { useState } from 'react';

import { CheckCircle2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button, Skeleton, WizardStep } from '@/components/ui';
import { ROUTE_PATHS, TIMING } from '@/config/constants';
import { type AdminRole, useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  usePublicRecruitmentConfigQuery,
  useSubmitRecruitmentApplicationMutation,
} from '@/hooks/domain/recruitment';

import { ApplicantApplicationWizard } from './components/ApplicantApplicationWizard';
import { RecruitmentPreGateSection } from './components/RecruitmentPreGateSection';

const APPLICATION_INTAKE_ROLES: ReadonlySet<AdminRole> = new Set([
  'admin',
  'super_admin',
  'kiosk',
  'vmt',
]);

export function RecruitmentApplyPage() {
  const [hasPassedGates, setHasPassedGates] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const { data: authState, isLoading: isAuthLoading } = useAdminAuthQuery();
  const adminRole = authState?.adminRole;
  const hasIntakeAccess = Boolean(
    authState?.isAuthenticated && adminRole && APPLICATION_INTAKE_ROLES.has(adminRole),
  );
  const configQuery = usePublicRecruitmentConfigQuery(hasIntakeAccess);
  const submitApplication = useSubmitRecruitmentApplicationMutation();

  const startNewApplication = () => {
    setSubmittedName(null);
    setHasPassedGates(false);
  };

  if (isAuthLoading) {
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-80 w-full" />
      </section>
    );
  }

  if (!authState?.session) {
    const redirectQuery = new URLSearchParams({ redirect: ROUTE_PATHS.recruitmentApply });
    return <Navigate to={`${ROUTE_PATHS.login}?${redirectQuery}`} replace />;
  }

  if (!hasIntakeAccess) {
    return (
      <section className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold text-text">Authorized device required</h1>
        <p className="text-sm text-muted">
          Sign in with an admin, super admin, kiosk, or VMT account to use this application form.
        </p>
        <Link className="text-sm font-semibold text-primary underline" to={ROUTE_PATHS.home}>
          Return to WelcomeHub
        </Link>
      </section>
    );
  }

  if (configQuery.isLoading) {
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-80 w-full" />
      </section>
    );
  }

  if (configQuery.isError || !configQuery.data) {
    return (
      <section className="mx-auto max-w-5xl">
        <section
          role="alert"
          className="border border-danger/30 bg-surface p-5 text-sm text-danger"
        >
          {configQuery.error?.message || 'Recruitment application settings are unavailable.'}
        </section>
      </section>
    );
  }

  if (!configQuery.data.is_recruitment_open) {
    return (
      <section className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold text-text">Applications are closed</h1>
        <p className="text-sm text-muted">
          Welcome Center recruitment is not accepting applications right now.
        </p>
        <Link className="text-sm font-semibold text-primary underline" to={ROUTE_PATHS.home}>
          Return to WelcomeHub
        </Link>
      </section>
    );
  }

  if (submittedName) {
    return (
      <section className="mx-auto max-w-5xl">
        <WizardStep
          title="Application submitted"
          subtitle={`Thank you, ${submittedName}. Your application has been received.`}
          countdownMs={TIMING.registrationWizardConfirmedResetMs}
          onCountdownTimeout={startNewApplication}
          countdownTimerMessage={(seconds) => `This kiosk will reset in ${seconds}s.`}
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <p className="text-sm text-text">
                To check your progress, open{' '}
                <Link className="font-semibold text-primary underline" to={ROUTE_PATHS.recruitment}>
                  /recruitment
                </Link>{' '}
                on your own phone and sign in with Google using the email address you entered.
              </p>
            </div>
            <Button onClick={startNewApplication} size="lg" fullWidth>
              Start New Application
            </Button>
          </div>
        </WizardStep>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      {hasPassedGates ? (
        <ApplicantApplicationWizard
          config={configQuery.data}
          isSubmitting={submitApplication.isPending}
          onBackToGates={() => setHasPassedGates(false)}
          onSubmit={(input) =>
            submitApplication.mutate(input, {
              onSuccess: () => {
                setSubmittedName(`${input.first_name} ${input.last_name}`);
                toast.success('Your Welcome Center application was submitted.');
              },
              onError: (error) =>
                toast.error(error.message || 'Unable to submit your application.'),
            })
          }
        />
      ) : (
        <RecruitmentPreGateSection onContinue={() => setHasPassedGates(true)} />
      )}
    </section>
  );
}

export default RecruitmentApplyPage;
