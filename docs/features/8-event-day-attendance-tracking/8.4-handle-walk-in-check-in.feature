Feature: Handle Unregistered Attendees via Same-Day Registration Reopen
  As admin check-in staff
  I want to route unregistered attendees through the normal registration flow
  So that event-day operations stay simple and attendance data stays consistent

  Context: Business Rules
    - Unregistered attendees are not checked in directly from the admin check-in screen
    - Admin can temporarily reopen registration for event day when policy allows additional attendees
    - Unregistered attendees must complete normal registration first
    - Once registration is completed, attendee uses the same standard check-in process as everyone else
    - Unregistered members CSV export is always full-event scope and does not use current UI search filters or pagination state

  Scenario: Guide unregistered attendee to registration flow
    Given attendance tracking is enabled for an event
    And I cannot find a registration for a person
    Then direct check-in is denied
    And I see guidance to complete registration first

  Scenario: Temporarily reopen registration on event day
    Given registration is currently closed for an event
    And event policy allows additional attendees
    When I reopen registration for event day
    Then the normal registration flow becomes available again
    And unregistered attendees can submit registration using standard rules

  Scenario: Process attendee with standard check-in after same-day registration
    Given an attendee completed registration after event-day reopening
    When I search and check in that attendee in admin
    Then the attendee is checked in through the normal check-in flow
    And first check-in time follows the official first-check-in rule

  Scenario: Keep registration closed when policy does not allow event-day additions
    Given registration is currently closed for an event
    And event policy does not allow additional attendees
    When I attempt to process an unregistered person
    Then I cannot reopen registration for that purpose
    And the person is not checked in
