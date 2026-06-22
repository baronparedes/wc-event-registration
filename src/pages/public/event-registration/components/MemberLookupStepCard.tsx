import type { RefObject } from 'react'
import { type SubmitHandler, type UseFormReturn } from 'react-hook-form'
import { SectionCard } from '../../../../components/ui/SectionCard'

const baseInputClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary'

type MemberLookupStepCardProps = {
  lookupForm: UseFormReturn<{ memberId: string }>
  onLookupSubmit: SubmitHandler<{ memberId: string }>
  isLookupPending: boolean
  lookupErrorMessage: string | null
  shouldFadeLookupError?: boolean
  memberIdInputRef: RefObject<HTMLInputElement | null>
  shouldHighlightInput?: boolean
}

export function MemberLookupStepCard(props: MemberLookupStepCardProps) {
  const {
    lookupForm,
    onLookupSubmit,
    isLookupPending,
    lookupErrorMessage,
    shouldFadeLookupError = false,
    memberIdInputRef,
    shouldHighlightInput = false,
  } = props

  const { ref: registerRef, ...registerRest } = lookupForm.register('memberId')

  return (
    <SectionCard title="Step 1: Enter Your Member ID" subtitle="Enter your member ID to continue.">
      <form className="space-y-3" onSubmit={lookupForm.handleSubmit(onLookupSubmit)} noValidate>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text" htmlFor="member-id-input">
            Member ID
          </label>
          <input
            id="member-id-input"
            type="text"
            autoComplete="off"
            placeholder="Type your member ID"
            className={`${baseInputClassName} ${
              shouldHighlightInput
                ? 'ring-2 ring-secondary/70 border-secondary focus:border-secondary'
                : ''
            }`}
            disabled={isLookupPending}
            ref={(el) => {
              registerRef(el)
              memberIdInputRef.current = el
            }}
            {...registerRest}
          />
          {lookupForm.formState.errors.memberId ? (
            <p className="text-sm text-danger">{lookupForm.formState.errors.memberId.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLookupPending}
        >
          {isLookupPending ? 'Checking...' : 'Continue'}
        </button>
      </form>

      {lookupErrorMessage ? (
        <p
          className={`mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger transition-opacity duration-500 ${
            shouldFadeLookupError ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {lookupErrorMessage}
        </p>
      ) : null}
    </SectionCard>
  )
}
