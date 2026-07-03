Feature: Manage Pre-Event Assignment Details
  As an admin
  I want to prepare assignment details before event day
  So that check-in staff can direct attendees quickly

  Context: Business Rules
    - Assignment details are separate from registration answers
    - Assignments are available only when attendance tracking is enabled
    - Assignment details may include table, area, team color, and area leader
    - Assignment changes are visible during check-in

  Scenario: Add assignment details for a registered attendee
    Given attendance tracking is enabled for an event
    And registered attendees exist
    When I set table, area, team color, and area leader for an attendee
    And I save the assignment
    Then the assignment is stored for that attendee
    And the attendee appears with assignment details in event-day tools

  Scenario: Update assignment details before event day
    Given an attendee already has saved assignment details
    When I change one or more assignment values
    And I save the update
    Then the updated assignment replaces the previous values
    And check-in screens show the latest assignment details

  Scenario: Save assignment with optional fields left blank
    Given attendance tracking is enabled for an event
    When I save an assignment with only required operational details
    Then the assignment is accepted
    And blank optional fields remain empty

  Scenario: Prevent assignment changes when attendance tracking is disabled
    Given attendance tracking is disabled for an event
    When I open assignment management
    Then assignment editing actions are unavailable
    And I see guidance to enable attendance first

  Scenario: View assignment summary list for event preparation
    Given multiple attendees have assignment details
    When I open the assignment list view
    Then I can review assignments per attendee
    And I can quickly identify missing assignment entries
