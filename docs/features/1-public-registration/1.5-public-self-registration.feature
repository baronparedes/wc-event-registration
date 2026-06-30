Feature: Public Self-Registration (Email-Based)
  As a public attendee without a member ID
  I want to register for an event using my personal details and email
  So that I can complete event signup from a kiosk or public terminal

  Context: Business Rules
    - Public self-registration is a separate flow from member ID registration
    - The flow is step-based: Step 1 (Attendee Info) -> Step 2 (Event Fields) -> Step 3 (Confirmation)
    - Duplicate checks are performed on Step 1 using the attendee email and event context
    - If the email already has a registration for the event, the duplicate message is shown inline on the Email input
    - Event-specific fields and validation rules still apply on Step 2
    - On Step 3, kiosk timeout is 30 seconds
    - When Step 3 timeout expires, the user is redirected to member registration for the same event
    - Before Step 3, kiosk inactivity timeout remains the longer default kiosk timeout

  Scenario: Public attendee completes registration successfully
    Given I am on the public registration page for an open event
    When I enter valid attendee information in Step 1
    And I complete required event fields in Step 2
    And I submit the registration
    Then I see Step 3 confirmation with my registration ID
    And I see a countdown indicating return to member registration

  Scenario: Duplicate email is blocked in Step 1
    Given I am on Step 1 of public registration
    And the email I entered is already registered for this event
    When I click Continue
    Then I remain on Step 1
    And I see the duplicate message on the Email input
    And I do not proceed to Step 2

  Scenario: Non-duplicate email can proceed to Step 2
    Given I am on Step 1 of public registration
    And the email I entered is not registered for this event
    When I click Continue
    Then I proceed to Step 2
    And I can fill in event-specific fields

  Scenario: Confirmation auto-returns after 30 seconds
    Given I successfully submitted public registration
    And I am on Step 3 confirmation
    When 30 seconds pass without interaction
    Then I am redirected to the member registration page for the same event
    And the public confirmation state is no longer shown

  Scenario: Return to Event button uses member registration route
    Given I am on Step 3 confirmation
    When I click "Return to Event"
    Then I am taken to the member registration page for that event
    And I am not routed back to the public self-registration page