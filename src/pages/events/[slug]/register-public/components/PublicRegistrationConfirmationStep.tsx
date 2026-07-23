import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { WizardStep } from '@/components/ui/WizardStep';
import { toEventRegistration } from '@/config/constants';

type PublicRegistrationConfirmationStepProps = {
  registrationId: string;
  email: string;
  eventSlug: string;
  canUpdate: boolean;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function PublicRegistrationConfirmationStep({
  registrationId,
  email,
  eventSlug,
  canUpdate,
  inactivityTimeoutMs,
  onInactivityTimeout,
}: PublicRegistrationConfirmationStepProps) {
  const isEmailEnabled = false;

  return (
    <WizardStep
      title="Registration Complete"
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) =>
        `Returning to member registration in ${s}s if no one continues.`
      }
    >
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text">Registration Confirmed!</h2>
          <p className="text-muted">
            Thank you for registering.{' '}
            {isEmailEnabled && `A confirmation email will be sent to ${email}.`}
          </p>
        </div>

        {canUpdate && (
          <div className="space-y-2 text-sm text-muted">
            <p>
              You can update your registration using the same email address you used for
              registration.
            </p>
          </div>
        )}

        <div
          aria-live="polite"
          className="registration-status-panel flex items-start gap-3 rounded-lg border-2 border-green-600 bg-green-100 px-4 py-3 text-green-950 shadow-md"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white ring-1 ring-green-800/30"
          >
            !
          </span>
          <div>
            <p className="registration-status-message text-sm font-medium text-green-900">
              Registration ID: {registrationId}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button asChild className="w-full" variant="outline" size="lg">
            <a href={toEventRegistration(eventSlug)}>Return to Event</a>
          </Button>
        </div>
      </div>
    </WizardStep>
  );
}
