Feature: Event Availability Pre-Check
  As the system
  I want to validate that an event is available before allowing registration
  So that members cannot register for events that are not open, closed, or archived

  Context: Business Rules
    - Event availability determined by: event status (Published/Draft/Archived), current date vs registration dates
    - Draft events: not visible to public, registration prevented
    - Published events: visible if registration dates allow, otherwise shown but registration blocked
    - Archived events: not visible on homepage, but may be viewable as read-only if member previously registered
    - Registration dates: registration_opens_at and registration_closes_at
    - Current date must be within registration window for public to register
    - Public cannot register if: event is draft, archived, or outside registration dates
    - Clear error messages explain why registration is not available
    - System prevents form submission if event is unavailable
    - Availability check runs before showing registration form

  Scenario: Published event with open registration
    Given an event is Published
    And current date is within registration window (opens_at < now < closes_at)
    When I try to access registration for this event
    Then I see the registration form
    And "Register" button is enabled
    And I can register

  Scenario: Draft event cannot be registered for
    Given an event is in Draft status
    When I try to access registration for this event (via URL or discovery)
    Then I see error: "This event is not yet available for registration"
    And registration form does not load
    And I cannot access the event registration flow

  Scenario: Archived event cannot be registered for
    Given an event is in Archived status
    When I try to access registration for this event
    Then I see error: "This event is no longer available for registration"
    And registration form does not load
    And I cannot complete registration

  Scenario: Event before registration opens
    Given an event is Published
    And registration hasn't opened yet (current date < registration_opens_at)
    When I access the event page
    Then I see event details
    And I see message: "Registration opens on [date]"
    And "Register" button is disabled
    And I cannot start registration

  Scenario: Event after registration closes
    Given an event is Published
    And registration has closed (current date > registration_closes_at)
    When I access the event page
    Then I see event details
    And I see message: "Registration closed on [date]"
    And "Register" button is disabled
    And I cannot register

  Scenario: Event with past dates
    Given an event has start date in the past
    And registration is also in the past
    When I try to register
    Then I see error: "This event has already taken place"
    And registration is not allowed

  Scenario: Form submission prevented if event unavailable
    Given I am on a registration form
    And the event status changes to Archived (or registration closes)
    When I fill the form and click "Submit"
    Then the submission is blocked
    And I see error: "This event is no longer available for registration"
    And my form data is preserved (not lost)

  Scenario: View closed event details
    Given an event is Published but registration closed
    When I view the event detail page
    Then I see all event information (read-only)
    And I see clearly that registration is closed
    And I cannot register
    And I can share/view the event for informational purposes

  Scenario: Multiple status checks
    Given various events exist with different statuses and dates
    When I browse the homepage
    Then each event shows accurate availability:
      - Open events: registration button enabled
      - Upcoming events: registration button disabled with "opens on" message
      - Closed events: registration button disabled with "closed on" message
      - Past events: registration button disabled with "already took place" message

  Scenario: Availability check includes time precision
    Given registration closes at 5:00 PM
    When current time is 4:59 PM
    Then registration is available
    When current time is 5:00:01 PM
    Then registration is closed
    And precise timing is enforced

  Scenario: Timezone handling for registration dates
    Given registration dates set in event creator's timezone
    When users in different timezones try to register
    Then registration dates are converted to user's local time for display
    And availability check uses server time (consistent)
