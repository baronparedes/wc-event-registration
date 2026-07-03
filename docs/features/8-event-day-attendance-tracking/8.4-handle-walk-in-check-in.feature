Feature: Handle Walk-In Check-In
  As admin check-in staff
  I want to process unregistered attendees based on event policy
  So that door operations stay controlled and consistent

  Context: Business Rules
    - Walk-in mode is disabled by default
    - Walk-in processing is only available when walk-in mode is enabled for the event
    - Required walk-in identity includes full name and at least one contact method
    - Approved walk-ins are marked as checked in immediately

  Scenario: Block walk-in when walk-in mode is disabled
    Given attendance tracking is enabled for an event
    And walk-in mode is disabled
    When I cannot find a registration for a person
    Then walk-in check-in is denied
    And I see guidance to complete standard registration first

  Scenario: Create and check in walk-in when walk-in mode is enabled
    Given attendance tracking is enabled for an event
    And walk-in mode is enabled
    When I cannot find a registration for a person
    And I enter required walk-in identity details
    Then a walk-in attendee record is created
    And the person is marked as checked in immediately

  Scenario: Validate required walk-in identity details
    Given walk-in mode is enabled
    When I submit a walk-in without full name
    Or I submit without any contact method
    Then the walk-in is not created
    And I see which required details are missing

  Scenario: Mark walk-ins clearly in attendance records
    Given a person was checked in as a walk-in
    When I view attendance details
    Then the attendee is clearly labeled as walk-in
    And staff can distinguish walk-ins from registered attendees

  Scenario: Continue normal check-in after walk-in processing
    Given I completed a walk-in check-in
    When I return to the check-in screen
    Then I can immediately process the next attendee
    And the previous walk-in result remains saved
