Feature: Track Attendance By Timeslot
  As admin check-in staff
  I want to record attendance for specific service timeslots
  So that attendance can be reviewed by slot as well as overall event totals

  Context: Business Rules
    - Timeslot attendance is optional per event
    - Timeslot mode can only be used when attendance tracking is enabled
    - Slot-specific attendance is additive and does not replace overall attendance
    - Official first check-in time remains the authoritative event attendance time

  Scenario: Check in attendee with selected timeslot
    Given attendance tracking is enabled for an event
    And timeslot attendance is enabled with slots 9AM, 12NN, and 3PM
    When I check in an attendee for the 12NN slot
    Then overall attendance is recorded for the attendee
    And attendance is also recorded for the 12NN slot

  Scenario: View slot-specific attendance separately
    Given attendees were checked in across multiple slots
    When I view attendance by timeslot
    Then I can see counts and attendees per slot
    And slot-specific results are separate from overall attendance totals

  Scenario: Continue check-in when no timeslot is selected in non-timeslot events
    Given attendance tracking is enabled for an event
    And timeslot attendance is disabled
    When I check in a registered attendee
    Then check-in succeeds without requiring a timeslot
    And only overall attendance is recorded

  Scenario: Prevent invalid timeslot selection
    Given timeslot attendance is enabled
    When I attempt to submit check-in with a timeslot that is not configured for the event
    Then check-in is rejected for that invalid slot selection
    And I see guidance to use a valid event timeslot

  Scenario: Preserve official first check-in time with repeated slot actions
    Given an attendee already has an official check-in time
    When I perform another attendance action for the same attendee in slot mode
    Then the official first check-in time does not change
    And slot records remain consistent with event rules
