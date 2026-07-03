export const TOAST_MESSAGES = {
  adminSignInSuccess: 'Welcome back. Admin access granted.',
  adminSignInFailure: 'Failed to sign in as admin.',
  adminSignOutSuccess: 'Signed out of admin session.',
  adminSignOutFailure: 'Failed to sign out.',
  eventSaved: {
    created: 'Event created successfully.',
    updated: 'Event updated successfully.',
    saveFailed: 'Failed to save event.',
    published: (eventTitle: string) => `"${eventTitle}" has been published.`,
    archived: (eventTitle: string) => `"${eventTitle}" has been archived.`,
    publishFailed: 'Failed to publish event. Please try again.',
    archiveFailed: 'Failed to archive event. Please try again.',
  },
  member: {
    created: 'Member created successfully.',
    createFailed: 'Failed to create member.',
    updated: 'Member updated successfully.',
    updateFailed: 'Failed to update member.',
    updateMemberIdFailed: 'Failed to update Member ID.',
    memberIdUpdated: (memberId: string) => `Member ID updated to "${memberId}".`,
  },
  registration: {
    submitted: 'Registration submitted successfully!',
    alreadyRegistered: 'Already registered for this event',
    submitFailed: 'Failed to submit registration',
    cancelFailed: 'Failed to cancel registration',
    reactivateFailed: 'Failed to reactivate registration',
    namesCopied: (count: number) =>
      `Copied ${count} registration${count === 1 ? '' : 's'} to clipboard.`,
    copyNamesFailed: 'Failed to copy registration names',
  },
} as const;

export const FORM_MESSAGES = {
  eventSlugMissing: 'Event slug is missing',
  memberLookupRequired: 'Member lookup is required',
  eventNotAvailable: 'Event is not available',
  memberLookupFailed: 'Member lookup failed',
} as const;

export const UI_MESSAGES = {
  loading: {
    events: 'Loading events...',
    event: 'Loading event...',
    members: 'Loading members...',
    member: 'Loading member...',
    registrations: 'Loading registrations...',
    registrationDetails: 'Loading registration details...',
  },
  errors: {
    eventsLoadFailed: 'Failed to load events. Please refresh.',
    membersLoadFailed: 'Failed to load members. Please refresh.',
    eventNotFound: 'Event not found.',
    memberNotFound: 'Member not found. Return to the members list.',
    registrationNotFound: 'Registration not found',
    unknownError: 'Unknown error',
  },
  empty: {
    noEventsYet: 'No events yet.',
    noMembersFound: 'No members found.',
    noMembersMatchedSearch: 'No members matched your search.',
    noRegistrationsYet: 'No registrations yet',
    noRegistrationsMatchedSearch: 'No registrations matched your search.',
  },
  registrationStatus: {
    submitted: 'Submitted',
    updated: 'Updated',
    cancelled: 'Cancelled',
  },
} as const;
