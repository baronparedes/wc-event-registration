Feature: Error Handling and User Feedback
  As the system
  I want to show clear, user-friendly error messages and handle failures gracefully
  So that users understand what went wrong and how to fix it

  Context: Business Rules
    - All errors shown to users are translated to business-friendly language (no technical jargon)
    - No stack traces, error codes, or system internals exposed to users
    - Validation errors shown inline on forms at field level
    - API/server errors shown as toast notifications or modal dialogs
    - Error messages are specific (not generic "An error occurred")
    - Transient errors (temporary network issues) auto-dismiss after delay
    - Persistent errors require user acknowledgment
    - Loading states shown during async operations (no frozen UI)
    - Timeout errors handled gracefully
    - Offline detection warns user if internet connection lost

  Scenario: Form validation error shown inline
    Given I'm on a registration form
    When I leave a required field blank
    And I click "Submit"
    Then an error message appears below the field
    And message: "[Field name] is required"
    And the field is highlighted
    And form does not submit

  Scenario: Invalid email format error
    Given I enter an invalid email in registration form
    When I click "Submit"
    Then error appears below email field
    And message: "Please enter a valid email address"
    And form does not submit

  Scenario: API error shown as user-friendly message
    Given I submit a registration form
    And the backend returns a server error (e.g., database unavailable)
    When the error is received
    Then I see a toast notification or dialog
    And message: "Something went wrong. Please try again later."
    And not: "500 Internal Server Error" or stack trace

  Scenario: Duplicate registration error
    Given I try to submit a registration twice (same member, same event, block policy)
    When the second submission is rejected
    Then I see error: "You have already registered for this event. Registration updates are not allowed."
    And clear guidance: "Contact support if you need to change your registration"

  Scenario: Member not found error
    Given I enter an invalid member ID
    When I click "Look Up Profile"
    Then I see error: "Member not found"
    And option to create new profile or try different ID
    And form is ready for retry

  Scenario: Transient network error auto-dismisses
    Given a temporary network issue occurs during form submission
    When the submission fails due to timeout
    Then I see a toast: "Network error. Retrying..."
    And the system auto-retries after a few seconds
    And if still failing after 3 attempts, I see: "Unable to connect. Please check your internet and try again."

  Scenario: Loading spinner during async operations
    Given I'm submitting a registration form
    When I click "Submit"
    Then a loading spinner appears
    And "Submit" button becomes disabled
    And I cannot submit again while loading
    And form fields remain visible (not grayed out)

  Scenario: Offline detection warning
    Given I lose internet connection
    When I'm on a page that requires network access
    Then I see a banner: "You are offline. Some features may not work."
    And I can still view cached content (if available)

  Scenario: Session timeout error
    Given my session has expired
    When I try to perform an admin action (edit event, etc.)
    Then I see error: "Your session has expired. Please log in again."
    And I'm offered button to return to login
    And my form data is not lost (can resume after re-login)

  Scenario: Rate limit error (friendly message)
    Given I've exceeded rate limit (too many lookup attempts)
    When I try another lookup
    Then I see: "Too many requests. Please wait a moment before trying again."
    And timer/countdown shown (optional)
    And error is not blaming user ("You did something wrong")

  Scenario: Validation error with multiple issues
    Given I submit a form with multiple errors (empty required fields, invalid email, etc.)
    When validation fails
    Then I see errors for each field clearly marked
    And form is not submitted
    And focus moves to first error

  Scenario: Success toast notification
    Given I successfully register for an event
    When registration completes
    Then I see a toast notification: "Registration successful! Your confirmation number is: XXXXX"
    And notification auto-dismisses after 5 seconds
    And I'm also shown confirmation on the page

  Scenario: Error with recovery suggestion
    Given an error occurs that has a clear resolution
    When the error message appears
    Then it includes a suggestion: "Try [action]" or "Contact support if problem persists"
    And user has clear next steps

  Scenario: No sensitive data in errors
    Given an error occurs involving personal data
    When error message is shown
    Then the message does not expose: full database IDs, member IDs beyond what needed, internal system names
    And message is generic enough not to reveal system details

  Scenario: Error boundary catches unhandled errors
    Given an unexpected error occurs that code doesn't handle
    When the error is thrown
    Then user sees: "Oops! Something went wrong. Please refresh the page and try again."
    And not: white screen or console errors
    And page remains usable
