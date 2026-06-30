export const TIMING = {
  searchDebounceMs: 300,
  errorFadeOutDelayMs: 4500,
  errorClearDelayMs: 5000,
  registrationLookupFadeOutDelayMs: 5000,
  registrationLookupClearDelayMs: 5600,
  registrationWizardConfirmTimeoutMs: 15 * 1000,
  kioskInactivityResetMs: 3 * 60 * 1000,
  rfidFocusRestoreDelayMs: 120,
  rfidFocusFallbackDelayMs: 200,
  rfidBlurRefocusDelayMs: 150,
  scanDeleteBufferAutoCompleteMs: 800,
  scanAutoCompleteMs: 300,
} as const
