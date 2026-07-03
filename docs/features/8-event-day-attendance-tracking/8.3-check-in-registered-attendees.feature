Feature: Check In Registered Attendees
  As admin check-in staff
  I want to check in registered attendees quickly
  So that event attendance is captured accurately at the door

  Context: Business Rules
    - Check-in supports RFID, name search, and email search
    - First check-in time is the official attendance time
    - Repeat scans or searches must not overwrite the official check-in time
    - Check-in view displays attendee identity, registration details, and assignment details

  Scenario: Check in by RFID scan
    Given attendance tracking is enabled for an event
    And a registered attendee has not checked in yet
    When I scan the attendee RFID
    Then the attendee is marked as checked in
    And the official check-in time is recorded
    And I see attendee registration and assignment details

  Scenario: Check in by name search
    Given attendance tracking is enabled for an event
    When I search using part of an attendee name
    And I select the correct attendee from matching results
    Then the attendee is marked as checked in
    And the official check-in time is recorded

  Scenario: Check in by email search
    Given attendance tracking is enabled for an event
    When I search by attendee email
    And I select the matching attendee
    Then check-in is completed
    And I see confirmation of successful check-in

  Scenario: Prevent duplicate timestamp on repeat check-in
    Given an attendee was already checked in at 8:57 AM
    When I scan or search the same attendee again
    Then I see a message that attendee is already checked in
    And the official check-in time remains 8:57 AM

  Scenario: Handle multiple search matches
    Given multiple attendees share similar names
    When I search by name
    Then I see a list of matching attendees with enough detail to choose correctly
    And check-in is completed only after I select one attendee

# Implementation Notes (MVP2 Session 1)

## Decision: DEC-004 — Edge-Mediated Attendee Search (Option B)

Check-in search (by RFID/Member ID, name, or email) is implemented via edge-mediated read endpoint.
- New Edge Function: search-attendees (verified_jwt = true)
- Handles query construction and disambiguation logic server-side
- Returns attendee match results with identity and collected attendance data
- Rationale: Simpler RLS surface than direct authenticated reads on attendance tables

## Integration: Attendance Data Collection in Check-In Display

The check-in view (feature 8.3) displays both:
1. Registration details (from registrations table)
2. Attendance field data (from attendance_field_answers table, collected in feature 8.2)

Admins configure what attendance data is collected (feature 8.2); check-in staff see that data during attendee lookup and check-in action (feature 8.3).
