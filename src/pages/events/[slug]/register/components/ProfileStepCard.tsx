import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { WizardStep } from '@/components/ui/WizardStep';
import type { MemberLookupProfile } from '@/lib/domain/members';

import { MemberIdentityPanel } from './MemberIdentityPanel';
import { RegistrationStatusPanel } from './RegistrationStatusPanel';

type ProfileStepCardProps = {
  matchedMember: MemberLookupProfile | null;
  isUpdateMode?: boolean;
  isRegistrationBlocked?: boolean;
  shouldFadeDetails?: boolean;
  onContinueToStepThree?: () => void;
  /** Duration in ms for the fixed step countdown. Requires onTimeout. */
  countdownMs?: number;
  /** Called when the step countdown expires — use to go back to step 1. */
  onTimeout?: () => void;
};

export function ProfileStepCard(props: ProfileStepCardProps) {
  const {
    matchedMember,
    isUpdateMode = false,
    isRegistrationBlocked = false,
    shouldFadeDetails = false,
    onContinueToStepThree,
    countdownMs,
    onTimeout,
  } = props;
  const shouldShowPlaceholder = !matchedMember || shouldFadeDetails;
  const registrationStatusRef = useRef<HTMLDivElement | null>(null);
  const canContinueToStepThree = !isRegistrationBlocked && Boolean(onContinueToStepThree);

  const countdownTimerMessage = (s: number): string => {
    if (isRegistrationBlocked) return `Returning to Step 1 in ${s}s.`;
    if (canContinueToStepThree) return `Returning to Step 1 in ${s}s if no one continues.`;
    return `Returning to Step 1 in ${s}s if this registration is not completed.`;
  };
  const placeholderTransitionClassName = shouldShowPlaceholder
    ? 'max-h-16 opacity-100 translate-y-0'
    : 'max-h-0 opacity-0 -translate-y-1';

  useEffect(() => {
    if (!matchedMember || !isRegistrationBlocked || shouldFadeDetails) {
      return;
    }

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

    registrationStatusRef.current?.scrollIntoView({
      behavior,
      block: 'center',
    });
  }, [matchedMember, isRegistrationBlocked, shouldFadeDetails]);

  return (
    <WizardStep
      title="Step 2: Confirm Your Details"
      countdownMs={countdownMs}
      onCountdownTimeout={onTimeout}
      countdownTimerMessage={countdownTimerMessage}
    >
      {matchedMember && !shouldFadeDetails && (
        <div className="transition-all duration-500 opacity-100 translate-y-0">
          <div className="registration-details-copy space-y-2 pb-0.5 text-sm text-muted">
            <MemberIdentityPanel matchedMember={matchedMember} />
            <RegistrationStatusPanel
              isRegistrationBlocked={isRegistrationBlocked}
              isUpdateMode={isUpdateMode}
              registrationStatusRef={registrationStatusRef}
            />

            {canContinueToStepThree && (
              <div className="pt-3">
                <Button
                  className="w-full"
                  onClick={onContinueToStepThree}
                  size="lg"
                  type="button"
                  variant="default"
                >
                  Yes, I confirm
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={`overflow-hidden transition-all duration-500 ${placeholderTransitionClassName}`}
      >
        <p className="registration-placeholder-copy text-sm text-muted">
          Your details will appear here after Step 1.
        </p>
      </div>
    </WizardStep>
  );
}
