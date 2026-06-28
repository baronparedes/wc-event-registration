import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import type { MemberLookupProfile } from '@/lib/domain/members'
import { SectionCard } from '@/components/ui/SectionCard'

type ProfileStepCardProps = {
  matchedMember: MemberLookupProfile | null
  isUpdateMode?: boolean
  isRegistrationBlocked?: boolean
  shouldFadeDetails?: boolean
  onContinueToStepThree?: () => void
  confirmTimeoutSecondsRemaining?: number | null
}

export function ProfileStepCard(props: ProfileStepCardProps) {
  const {
    matchedMember,
    isUpdateMode = false,
    isRegistrationBlocked = false,
    shouldFadeDetails = false,
    onContinueToStepThree,
    confirmTimeoutSecondsRemaining = null,
  } = props
  const shouldShowPlaceholder = !matchedMember || shouldFadeDetails
  const registrationStatusRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!matchedMember || !isRegistrationBlocked || shouldFadeDetails) {
      return
    }

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'

    registrationStatusRef.current?.scrollIntoView({
      behavior,
      block: 'center',
    })
  }, [matchedMember, isRegistrationBlocked, shouldFadeDetails])

  return (
    <SectionCard
      title="Step 2: Confirm Your Details"
      wrapperClassName="registration-step-card rounded-2xl border border-border bg-surface p-6 shadow-sm"
      titleClassName="registration-step-card__title font-heading text-xl font-semibold text-text"
      contentClassName="registration-step-card__content mt-2"
    >
      {matchedMember ? (
        <div
          className={`overflow-hidden transition-all duration-500 ${
            shouldFadeDetails
              ? 'max-h-0 opacity-0 -translate-y-1'
              : 'max-h-[32rem] opacity-100 translate-y-0'
          }`}
        >
          <div className="registration-details-copy space-y-2 pb-0.5 text-sm text-muted">
            <p>
              Name: <span className="font-medium text-text">{matchedMember.full_name}</span>
            </p>
            <p>
              Nickname:{' '}
              <span className="font-medium text-text">
                {matchedMember.nickname ? matchedMember.nickname : 'Not set'}
              </span>
            </p>
            <p>
              First name:{' '}
              <span className="font-medium text-text">
                {matchedMember.first_name ? matchedMember.first_name : 'Not set'}
              </span>
            </p>
            <p>
              Last name:{' '}
              <span className="font-medium text-text">
                {matchedMember.last_name ? matchedMember.last_name : 'Not set'}
              </span>
            </p>
            <div
              ref={registrationStatusRef}
              aria-live="polite"
              className={`mt-2 flex items-start gap-3 rounded-lg border-2 px-4 py-3 shadow-md ${
                isRegistrationBlocked
                  ? 'border-green-600 bg-green-100 text-green-950'
                  : isUpdateMode
                    ? 'border-green-600 bg-green-100 text-green-950'
                    : 'border-primary bg-primary text-white'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-sm font-bold ring-1 ${
                  isRegistrationBlocked
                    ? 'bg-green-700 text-white ring-green-800/30'
                    : isUpdateMode
                      ? 'bg-green-700 text-white ring-green-800/30'
                      : 'bg-white/20 text-white ring-white/40'
                }`}
              >
                !
              </span>
              <div className="space-y-1">
                <p className="registration-status-title text-base font-semibold leading-6">
                  {isRegistrationBlocked
                    ? 'You are already registered. No further actions are needed at the moment.'
                    : isUpdateMode
                      ? 'You are already registered. You can now update your registration details.'
                      : 'You are verified. You can now complete your registration form.'}
                </p>
                <p
                  className={`registration-status-message text-sm font-medium ${
                    isRegistrationBlocked
                      ? 'text-green-900'
                      : isUpdateMode
                        ? 'text-green-900'
                        : 'text-white/95'
                  }`}
                >
                  {isRegistrationBlocked
                    ? 'Your registration is already complete for this event.'
                    : `Proceed to Step 3 below to ${isUpdateMode ? 'review and update' : 'fill out'} the remaining registration fields.`}
                </p>
              </div>
            </div>

            {!isRegistrationBlocked && onContinueToStepThree ? (
              <div className="pt-3">
                <Button onClick={onContinueToStepThree} size="md" type="button" variant="default">
                  Yes, Continue to Step 3
                </Button>
                {confirmTimeoutSecondsRemaining ? (
                  <p
                    className="registration-timeout-copy mt-2 text-sm text-muted"
                    aria-live="polite"
                  >
                    Returning to Step 1 in {confirmTimeoutSecondsRemaining}s if no one continues.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={`overflow-hidden transition-all duration-500 ${
          shouldShowPlaceholder
            ? 'max-h-16 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-1'
        }`}
      >
        <p className="registration-placeholder-copy text-sm text-muted">
          Your details will appear here after Step 1.
        </p>
      </div>
    </SectionCard>
  )
}
