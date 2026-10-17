import { CheckCircle2 } from 'lucide-react';

import { Button, WizardStep } from '@/components/ui';

import { formatServiceSlots } from '../utils';
import { ExcuseHeaderCard } from './ExcuseHeaderCard';

export type ExcuseConfirmationStepCardProps = {
  submissionResult: {
    request_date: string;
    services: string[];
    reason: string;
  };
  volunteerName: string;
  volunteerMemberId?: string;
  onSubmitAnother: () => void;
  onGoHome: () => void;
};

export function ExcuseConfirmationStepCard({
  submissionResult,
  volunteerName,
  volunteerMemberId,
  onSubmitAnother,
  onGoHome,
}: ExcuseConfirmationStepCardProps) {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <ExcuseHeaderCard defaultExpanded={false} />

      <WizardStep title="Submission Complete">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-primary" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text">Excuse Request Submitted!</h2>
            <p className="text-muted">
              Thank you for letting your team leaders and coordinators know in advance.
            </p>
          </div>

          <div
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border-2 border-green-600 bg-green-100 px-4 py-3 text-green-950 shadow-md text-left"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white ring-1 ring-green-800/30"
            >
              ✓
            </span>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-green-950">
                {volunteerName} {volunteerMemberId ? `(${volunteerMemberId})` : ''}
              </p>
              <p className="text-green-900">
                Sunday Date:{' '}
                <span className="font-medium">
                  {new Date(`${submissionResult.request_date}T00:00:00`).toLocaleDateString(
                    'en-US',
                    {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    },
                  )}
                </span>
              </p>
              <p className="text-green-900">
                Excused Services:{' '}
                <span className="font-medium">{formatServiceSlots(submissionResult.services)}</span>
              </p>
              {submissionResult.reason && (
                <p className="text-green-900">
                  Reason: <span className="font-medium italic">"{submissionResult.reason}"</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button className="w-full" onClick={onSubmitAnother} size="lg" variant="default">
              Submit Another Request
            </Button>

            <Button className="w-full" onClick={onGoHome} size="lg" variant="primaryOutline">
              Go Home
            </Button>
          </div>
        </div>
      </WizardStep>
    </section>
  );
}
