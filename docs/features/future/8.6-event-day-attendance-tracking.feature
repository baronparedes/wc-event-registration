# TODO: Assigned non-admin event staff is deferred; MVP access uses admin users only.
# TODO: Timeslot check-in UI details are deferred, but per-timeslot behavior is specified.

Feature: Event Day Attendance Tracking and Enrichment
  As an event organizer
  I want to prepare assignments, check people in quickly during event day, and export attendance results
  So that I can run operations smoothly and produce accurate post-event attendance records

  Context: Business Rules
    - Attendance tracking is optional per event and is disabled by default
    - Existing registration behavior stays unchanged when attendance tracking is disabled
    - Pre-event assignment details are managed in a separate admin-only assignment form
    - Assignment details may include table, area, team color, area leader, and other event-specific fields
    - During event day, check-in can be done by RFID, name search, or email search
    - Check-in view shows original registration details, assignment details, and key attendee details
    - If a person is checked in more than once, first check-in time remains the official attendance time
    - Unregistered attendees are handled by reopening registration when policy allows
    - Unregistered attendees must complete normal registration before check-in
    - Attendance export is separate from registration export
    - Optional timeslot attendance can be enabled per event to track attendance by service slot (for example: 9AM, 12NN, 3PM)

  Scenario: Enable attendance tracking for an event
    Given I am managing an event in admin
    When I enable attendance tracking for that event
    Then event-day check-in tools become available for that event
    And attendance reports become available for that event

  Scenario: Prepare pre-event assignment details
    Given attendance tracking is enabled for an event
    And registered attendees exist
    When I assign details such as table, area, team color, and area leader
    Then those assignments are saved to each attendee record for the event
    And staff can see those assignments during check-in

  Scenario: Check in attendee by RFID
    Given attendance tracking is enabled for an event
    And a registered attendee has not checked in yet
    When staff scans the attendee RFID
    Then the attendee is marked as checked in
    And the check-in time is recorded
    And staff sees original registration and assignment details

  Scenario: Check in attendee by name or email search
    Given attendance tracking is enabled for an event
    And staff is at the check-in screen
    When staff searches by name or email
    Then matching attendees are shown for selection
    And after staff selects the correct attendee, check-in is completed
    And staff sees original registration and assignment details

  Scenario: Prevent duplicate attendance timestamps
    Given an attendee was already checked in at 8:57 AM
    When staff scans or searches the same attendee again
    Then the system shows "Already checked in"
    And the official check-in time remains 8:57 AM

  Scenario: Handle unregistered person when registration remains closed
    Given attendance tracking is enabled for an event
    And registration is closed for this event
    When staff attempts to check in a person with no registration
    Then check-in is denied
    And staff sees guidance to complete registration first

  Scenario: Handle unregistered person by reopening registration
    Given attendance tracking is enabled for an event
    And registration is currently closed
    When admin reopens registration for event day
    And staff cannot find a registration for a person
    Then staff directs the person to complete normal registration
    And after registration, the attendee can be checked in through standard flow

  Scenario: Track attendance by service timeslot when enabled
    Given attendance tracking is enabled for an event
    And timeslot attendance is enabled with slots 9AM, 12NN, and 3PM
    When staff checks in an attendee for the 12NN slot
    Then attendance is recorded for the 12NN slot
    And slot-specific attendance can be viewed separately from overall event attendance

  Scenario: Export attendance after event day
    Given attendance records exist for an event
    When I export attendance data
    Then I receive a separate attendance CSV file
    And each row includes attendee identity, attendance status, check-in time, and assignment details
    And only registered attendees are included

  Scenario: Attendance tools remain hidden when feature is disabled
    Given attendance tracking is disabled for an event
    When staff opens event operations pages
    Then check-in actions are not available
    And attendance export is not available
