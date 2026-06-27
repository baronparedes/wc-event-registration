export const TOAST_MESSAGES = {
  adminSignInSuccess: 'Welcome back. Admin access granted.',
  adminSignInFailure: 'Failed to sign in as admin.',
  adminSignOutSuccess: 'Signed out of admin session.',
  adminSignOutFailure: 'Failed to sign out.',
  eventSaved: {
    created: 'Event created successfully.',
    updated: 'Event updated successfully.',
    saveFailed: 'Failed to save event.',
  },
  registration: {
    submitted: 'Registration submitted successfully!',
    alreadyRegistered: 'Already registered for this event',
    submitFailed: 'Failed to submit registration',
  },
} as const

export const FORM_MESSAGES = {
  eventSlugMissing: 'Event slug is missing',
  memberLookupRequired: 'Member lookup is required',
  eventNotAvailable: 'Event is not available',
  memberLookupFailed: 'Member lookup failed',
} as const
