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
            slug={slug}
            lookupForm={memberLookup.lookupForm}
            onLookupSubmit={handleLookupSubmit}
            isLookupPending={memberLookup.isLookupPending}
            lookupErrorMessage={lookupErrorMessage}
            suppressLookupWarning={memberLookup.isRegistrationBlocked}
            memberIdInputRef={memberIdInputRef}
            shouldHighlightInput={memberLookup.memberIdHighlight}
            onDismissLookupError={clearLookupError}
            allowNameLookup={
              availability?.status === 'available' && availability.event
                ? Boolean(availability.event.metadata?.allow_name_lookup)
                : false
            }
            allowPublicRegistration={
              availability?.status === 'available' && availability.event
                ? Boolean(availability.event.allow_public_registrations)
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
