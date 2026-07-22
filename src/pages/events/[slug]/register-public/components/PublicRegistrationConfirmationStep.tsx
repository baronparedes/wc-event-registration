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

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm text-muted">
            <p>Registration ID: {registrationId}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted">
          {canUpdate && (
            <p>
              You can update your registration using the same email address you used for
              registration.
            </p>
          )}
          <p>
            If you need to register for another event, visit the{' '}
            <a href="/" className="font-medium text-primary hover:underline">
              events page
            </a>
            .
          </p>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline" asChild>
            <a href="/">Browse Other Events</a>
          </Button>
          <Button asChild>
            <a href={toEventRegistration(eventSlug)}>Return to Event</a>
          </Button>
        </div>
      </div>
    </WizardStep>
  );
}
