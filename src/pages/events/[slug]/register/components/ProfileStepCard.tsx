import { useEffect, useRef } from 'react';

import { SectionCard } from '@/components/ui/SectionCard';
import type { MemberLookupProfile } from '@/lib/domain/members';

import { MemberIdentityPanel } from './MemberIdentityPanel';
import { ProfileStepFooter } from './ProfileStepFooter';
import { RegistrationStatusPanel } from './RegistrationStatusPanel';

type ProfileStepCardProps = {
  matchedMember: MemberLookupProfile | null;
  isUpdateMode?: boolean;
  isRegistrationBlocked?: boolean;
  shouldFadeDetails?: boolean;
  onContinueToStepThree?: () => void;
  stepTimeoutSecondsRemaining?: number | null;
};

export function ProfileStepCard(props: ProfileStepCardProps) {
  const {
    matchedMember,
    isUpdateMode = false,
    isRegistrationBlocked = false,
    shouldFadeDetails = false,
    onContinueToStepThree,
    stepTimeoutSecondsRemaining = null,
  } = props;
  const shouldShowPlaceholder = !matchedMember || shouldFadeDetails;
  const registrationStatusRef = useRef<HTMLDivElement | null>(null);
  const canContinueToStepThree = !isRegistrationBlocked && Boolean(onContinueToStepThree);
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
    <SectionCard
      title="Step 2: Confirm Your Details"
      wrapperClassName="registration-step-card rounded-2xl border border-border bg-surface p-6 shadow-sm"
      titleClassName="registration-step-card__title font-heading text-xl font-semibold text-text"
      contentClassName="registration-step-card__content mt-2"
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

            <ProfileStepFooter
              canContinueToStepThree={canContinueToStepThree}
              isRegistrationBlocked={isRegistrationBlocked}
              onContinueToStepThree={onContinueToStepThree}
              stepTimeoutSecondsRemaining={stepTimeoutSecondsRemaining}
            />
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
    </SectionCard>
  );
}
