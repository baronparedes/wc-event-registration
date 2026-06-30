import { useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { NameLookupModal } from './NameLookupModal'
import { MemberLookupMethodSelector } from './MemberLookupMethodSelector'
import { MemberLookupErrorAlert } from './MemberLookupErrorAlert'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

type MemberLookupStepCardProps = {
  slug?: string
  lookupForm: UseFormReturn<{ memberId?: string; name?: string }>
  onLookupSubmit: SubmitHandler<{ memberId?: string; name?: string }>
  isLookupPending: boolean
  lookupErrorMessage: string | null
  suppressLookupWarning?: boolean
  memberIdInputRef: RefObject<HTMLInputElement | null>
  shouldHighlightInput?: boolean
  onDismissLookupError?: () => void
  allowNameLookup: boolean
  allowPublicRegistration?: boolean
}

export function MemberLookupStepCard(props: MemberLookupStepCardProps) {
  const navigate = useNavigate()
  const {
    slug,
    lookupForm,
    onLookupSubmit,
    isLookupPending,
    lookupErrorMessage,
    suppressLookupWarning = false,
    memberIdInputRef,
    shouldHighlightInput = false,
    onDismissLookupError,
    allowNameLookup,
    allowPublicRegistration = false,
  } = props

  const { ref: memberIdRef, ...memberIdRest } = lookupForm.register('memberId')
  const [lookupMethod, setLookupMethod] = useState<'id' | 'name' | null>(
    !allowNameLookup ? 'id' : null,
  )

  const handleNameLookupSubmit = async (name: string) => {
    await onLookupSubmit({ memberId: undefined, name })
  }

  return (
    <>
      <SectionCard
        title="Step 1: Find Your Profile"
        subtitle="How do you want to search your profile?"
        wrapperClassName="registration-step-card rounded-2xl border border-border bg-surface p-6 shadow-sm"
        titleClassName="registration-step-card__title font-heading text-2xl font-semibold text-text"
        subtitleClassName="registration-step-card__subtitle mt-3 text-base text-muted"
        contentClassName="registration-step-card__content mt-3"
      >
        {/* Step 1: Choose lookup method */}
        {lookupMethod === null && (
          <MemberLookupMethodSelector
            allowNameLookup={allowNameLookup}
            isLookupPending={isLookupPending}
            onSelectMethod={setLookupMethod}
          />
        )}

        {/* Step 2a: ID lookup */}
        {lookupMethod === 'id' && (
          <form className="space-y-3" onSubmit={lookupForm.handleSubmit(onLookupSubmit)} noValidate>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="registration-field-label text-sm font-medium text-text"
                  htmlFor="member-id-input"
                >
                  Scan RFID or Member ID
                </label>
                {allowNameLookup && (
                  <button
                    type="button"
                    onClick={() => setLookupMethod(null)}
                    className="text-md text-muted underline transition hover:text-text"
                  >
                    Try a different way
                  </button>
                )}
              </div>

              <input
                id="member-id-input"
                type="text"
                autoComplete="off"
                placeholder="Scan or enter your Member ID"
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
                autoFocus
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
        )}

        {/* Step 2b: Name lookup */}
        {lookupMethod === 'name' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text">Search by Name</h3>
              <button
                type="button"
                onClick={() => setLookupMethod(null)}
                className="text-md text-muted underline transition hover:text-text"
              >
                Try a different way
              </button>
            </div>

            <NameLookupModal
              onSubmit={handleNameLookupSubmit}
              isLookupPending={isLookupPending}
              variant="card"
              autoOpen={true}
            />
          </div>
        )}

        <MemberLookupErrorAlert
          message={lookupErrorMessage}
          suppress={suppressLookupWarning}
          onDismiss={onDismissLookupError}
        />
      </SectionCard>

      {/* Guest/non-member registration option */}
      {slug && allowPublicRegistration && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate(`/events/${slug}/register-public`)}
            className="text-sm text-primary underline transition hover:text-primary/80"
          >
            Not a Member? Register as guest
          </button>
        </div>
      )}
    </>
  )
}
