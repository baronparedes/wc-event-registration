import {
  DynamicFieldsStepCard,
  EventHeaderCard,
  LockedGateCard,
  MemberLookupStepCard,
  ProfileStepCard,
} from '@/pages/events/[slug]/register/components'
import { useEventRegistrationPageState } from '../hooks'

export function ClassicEventRegistrationFlow() {
  const {
    slug,
    eventQuery,
    availability,
    isGateReady,
    eventWindowText,
    memberLookup,
    handleLookupSubmit,
    lookupErrorMessage,
    lookupErrorFadeOut,
    memberIdInputRef,
    clearLookupError,
    dynamicFieldsStepRef,
    eventFieldsQuery,
    activeFields,
    kioskIdleSecondsRemaining,
    dynamicForm,
    handleSubmitRegistration,
    fieldErrorMessage,
    submitMutation,
    submitErrorMessage,
    submitSuccessMessage,
    handleCancelUpdate,
    isRegistrationBlockedForCurrentFlow,
    shouldFadeBlockedRegistrationState,
  } = useEventRegistrationPageState('classic')

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <EventHeaderCard
        slug={slug}
        isLoading={eventQuery.isLoading}
        isError={eventQuery.isError}
        availability={availability}
        isGateReady={isGateReady}
        eventWindowText={eventWindowText}
      />

      {isGateReady ? (
        <div className="space-y-6">
          <MemberLookupStepCard
            lookupForm={memberLookup.lookupForm}
            onLookupSubmit={handleLookupSubmit}
            isLookupPending={memberLookup.isLookupPending}
            lookupErrorMessage={lookupErrorMessage}
            shouldFadeLookupError={lookupErrorFadeOut}
            suppressLookupWarning={memberLookup.isRegistrationBlocked}
            memberIdInputRef={memberIdInputRef}
            shouldHighlightInput={memberLookup.memberIdHighlight}
            onDismissLookupError={clearLookupError}
            allowNameLookup={
              availability && 'event' in availability
                ? (availability.event?.metadata?.allow_name_lookup ?? false)
                : false
            }
          />

          <ProfileStepCard
            matchedMember={memberLookup.matchedMember}
            isUpdateMode={memberLookup.isUpdateMode}
            isRegistrationBlocked={isRegistrationBlockedForCurrentFlow}
            shouldFadeDetails={shouldFadeBlockedRegistrationState}
            stepTimeoutSecondsRemaining={kioskIdleSecondsRemaining}
          />

          <div ref={dynamicFieldsStepRef}>
            <DynamicFieldsStepCard
              matchedMember={memberLookup.matchedMember}
              isLocked={isRegistrationBlockedForCurrentFlow}
              shouldFadeLockedState={shouldFadeBlockedRegistrationState}
              lockedMessage={memberLookup.lockedStepMessage}
              onCancelUpdate={handleCancelUpdate}
              isLoadingFields={eventFieldsQuery.isLoading}
              isFieldsError={eventFieldsQuery.isError}
              fieldConfigIssues={eventFieldsQuery.data?.issues ?? []}
              activeFields={activeFields}
              dynamicForm={dynamicForm}
              onSubmit={handleSubmitRegistration}
              fieldErrorMessage={fieldErrorMessage}
              isSubmitPending={submitMutation.isPending}
              submitButtonLabel={memberLookup.isUpdateMode ? 'Update' : 'Submit Registration'}
              submitErrorMessage={submitErrorMessage}
              submitSuccessMessage={submitSuccessMessage}
              stepTimeoutSecondsRemaining={kioskIdleSecondsRemaining}
            />
          </div>
        </div>
      ) : (
        <LockedGateCard />
      )}
    </section>
  )
}
