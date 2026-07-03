import { Button } from '@/components/ui/Button';

type ProfileStepFooterProps = {
  canContinueToStepThree: boolean;
  isRegistrationBlocked: boolean;
  onContinueToStepThree?: () => void;
  stepTimeoutSecondsRemaining: number | null;
};

function buildTimeoutMessage(
  stepTimeoutSecondsRemaining: number | null,
  isRegistrationBlocked: boolean,
  canContinueToStepThree: boolean,
): string | null {
  if (!stepTimeoutSecondsRemaining) {
    return null;
  }

  if (isRegistrationBlocked) {
    return `Returning to Step 1 in ${stepTimeoutSecondsRemaining}s.`;
  }

  if (canContinueToStepThree) {
    return `Returning to Step 1 in ${stepTimeoutSecondsRemaining}s if no one continues.`;
  }

  return `Returning to Step 1 in ${stepTimeoutSecondsRemaining}s if this registration is not completed.`;
}

export function ProfileStepFooter(props: ProfileStepFooterProps) {
  const {
    canContinueToStepThree,
    isRegistrationBlocked,
    onContinueToStepThree,
    stepTimeoutSecondsRemaining,
  } = props;

  const timeoutMessage = buildTimeoutMessage(
    stepTimeoutSecondsRemaining,
    isRegistrationBlocked,
    canContinueToStepThree,
  );

  if (canContinueToStepThree) {
    return (
      <div className="pt-3">
        <Button onClick={onContinueToStepThree} size="md" type="button" variant="default">
          Yes, I confirm
        </Button>
        {timeoutMessage && (
          <p className="registration-timeout-copy mt-2 text-sm text-muted" aria-live="polite">
            {timeoutMessage}
          </p>
        )}
      </div>
    );
  }

  if (timeoutMessage) {
    return (
      <p className="registration-timeout-copy mt-3 text-sm text-muted" aria-live="polite">
        {timeoutMessage}
      </p>
    );
  }

  return null;
}
