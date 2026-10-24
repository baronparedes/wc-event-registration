import { CheckCircle2, Clock } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { WizardStep } from '@/components/ui/WizardStep';

type FormConfirmationStepCardProps = {
  submissionId: string;
  status: 'submitted' | 'updated' | 'pending_approval';
  message?: string | null;
  onReset: () => void;
  onGoHome: () => void;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function FormConfirmationStepCard({
  submissionId,
  status,
  message,
  onReset,
  onGoHome,
  inactivityTimeoutMs,
  onInactivityTimeout,
}: FormConfirmationStepCardProps) {
  const isPendingApproval = status === 'pending_approval';

  const headingText = isPendingApproval
    ? 'Submission Received – Pending Approval'
    : status === 'updated'
      ? 'Submission Updated!'
      : 'Form Submitted!';

  const descriptionText = isPendingApproval
    ? message ||
      'Thank you for completing this form. Your response has been recorded and is pending review by the designated administrator.'
    : 'Thank you for completing this form. Your response has been recorded.';

  return (
    <WizardStep
      title={isPendingApproval ? 'Submission Pending Approval' : 'Submission Complete'}
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) => `Resetting in ${s}s.`}
    >
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          {isPendingApproval ? (
            <Clock className="h-16 w-16 text-amber-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-16 w-16 text-primary" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text">{headingText}</h2>
          <p className="text-muted">{descriptionText}</p>
        </div>

        {isPendingApproval ? (
          <div
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-3 text-amber-950 shadow-md text-left"
          >
            <Clock className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Status: Pending Review</p>
              <p className="text-sm font-medium text-amber-900">
                Submission ID: <span className="font-mono text-xs">{submissionId}</span>
              </p>
            </div>
          </div>
        ) : (
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
            <div>
              <p className="text-sm font-medium text-green-900">
                Submission ID: <span className="font-mono text-xs">{submissionId}</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-full" onClick={onReset} size="lg" variant="default">
            Submit Another Response
          </Button>
          <Button className="w-full" onClick={onGoHome} size="lg" variant="primaryOutline">
            Go Home
          </Button>
        </div>
      </div>
    </WizardStep>
  );
}
