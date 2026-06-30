import { useEffect, useRef, useState, type RefObject } from 'react'
import { type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { NameLookupModal } from './NameLookupModal'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

type MemberLookupStepCardProps = {
  lookupForm: UseFormReturn<{ memberId?: string; name?: string }>
  onLookupSubmit: SubmitHandler<{ memberId?: string; name?: string }>
  isLookupPending: boolean
  lookupErrorMessage: string | null
  shouldFadeLookupError?: boolean
  suppressLookupWarning?: boolean
  memberIdInputRef: RefObject<HTMLInputElement | null>
  shouldHighlightInput?: boolean
  onDismissLookupError?: () => void
  allowNameLookup: boolean
}

export function MemberLookupStepCard(props: MemberLookupStepCardProps) {
  const {
    lookupForm,
    onLookupSubmit,
    isLookupPending,
    lookupErrorMessage,
    shouldFadeLookupError = false,
    suppressLookupWarning = false,
    memberIdInputRef,
    shouldHighlightInput = false,
    onDismissLookupError,
    allowNameLookup,
  } = props

  const { ref: memberIdRef, ...memberIdRest } = lookupForm.register('memberId')
  const lookupErrorRef = useRef<HTMLDivElement | null>(null)

  const [errorCountdown, setErrorCountdown] = useState(0)

  useEffect(() => {
    if (!lookupErrorMessage || suppressLookupWarning) {
      return
    }

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'

    lookupErrorRef.current?.scrollIntoView({
      behavior,
      block: 'center',
    })
  }, [lookupErrorMessage, suppressLookupWarning])

  // Countdown timer for auto-dismiss
  useEffect(() => {
    if (!lookupErrorMessage || suppressLookupWarning || shouldFadeLookupError) {
      return
    }

    let remaining = 5
    const interval = setInterval(() => {
      remaining -= 1
      setErrorCountdown(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        // Trigger dismiss when countdown reaches 0
        if (onDismissLookupError) {
          onDismissLookupError()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lookupErrorMessage, suppressLookupWarning, shouldFadeLookupError, onDismissLookupError])

  const handleNameLookupSubmit = async (name: string) => {
    await onLookupSubmit({ memberId: undefined, name })
  }

  return (
    <>
      <SectionCard
        title="Step 1: Scan your RFID"
        subtitle="Scan your RFID or enter your Member ID to continue with registration."
        wrapperClassName="registration-step-card rounded-2xl border border-border bg-surface p-6 shadow-sm"
        titleClassName="registration-step-card__title font-heading text-xl font-semibold text-text"
        subtitleClassName="registration-step-card__subtitle mt-2 text-sm text-muted"
        contentClassName="registration-step-card__content mt-3"
      >
        <form className="space-y-3" onSubmit={lookupForm.handleSubmit(onLookupSubmit)} noValidate>
          {/* Member ID input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label
                className="registration-field-label text-sm font-medium text-text"
                htmlFor="member-id-input"
              >
                Member ID
              </label>

              {/* Subtle link for name-based lookup */}
              {allowNameLookup && (
                <NameLookupModal
                  onSubmit={handleNameLookupSubmit}
                  isLookupPending={isLookupPending}
                />
              )}
            </div>

            <input
              id="member-id-input"
              type="text"
              autoComplete="off"
              placeholder="Type your member ID"
              className={`${baseInputClassName} registration-field-input ${
                shouldHighlightInput
                  ? 'ring-2 ring-secondary/70 border-secondary focus:border-secondary'
                  : ''
              }`}
              disabled={isLookupPending}
              ref={(el) => {
                memberIdRef(el)
                memberIdInputRef.current = el
              }}
              {...memberIdRest}
            />
            {lookupForm.formState.errors.memberId && (
              <p className="registration-field-error text-sm text-danger">
                {lookupForm.formState.errors.memberId.message}
              </p>
            )}
          </div>

          <Button disabled={isLookupPending} size="md" type="submit" variant="default">
            {isLookupPending ? 'Checking...' : 'Continue'}
          </Button>
        </form>

        {lookupErrorMessage && !suppressLookupWarning && (
          <div
            ref={lookupErrorRef}
            className={`overflow-hidden transition-all duration-500 ${
              shouldFadeLookupError
                ? 'mt-0 max-h-0 opacity-0 -translate-y-1'
                : 'mt-4 max-h-40 opacity-100 translate-y-0'
            }`}
          >
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-3 rounded-lg border-2 border-orange-700 bg-orange-200 px-4 py-3 text-orange-950 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-700 text-sm font-bold text-white ring-1 ring-orange-900/30"
              >
                !
              </span>
              <div className="flex w-full items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="registration-alert-title text-sm font-semibold text-orange-950">
                    Please check your entry
                  </p>
                  <p className="registration-alert-message text-sm text-orange-900">
                    {lookupErrorMessage}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {errorCountdown > 0 && (
                    <span className="text-xs font-medium text-orange-700" aria-live="polite">
                      ({errorCountdown}s)
                    </span>
                  )}
                  {onDismissLookupError && (
                    <button
                      type="button"
                      onClick={onDismissLookupError}
                      className="rounded-md border border-orange-700/40 px-2 py-1 text-xs font-medium text-orange-950 transition hover:bg-orange-300/60 focus:outline-none focus:ring-2 focus:ring-orange-700/60"
                      aria-label="Dismiss member lookup warning"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  )
}
