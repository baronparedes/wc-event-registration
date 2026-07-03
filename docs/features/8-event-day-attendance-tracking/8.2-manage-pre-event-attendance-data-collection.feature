Feature: Manage Pre-Event Attendance Data Collection
  As an admin
  I want to configure what attendance data to collect and fill it in before event day
  So that check-in staff have complete context and can direct attendees efficiently

  Context: Business Rules
    - Attendance data collection is separate from registration answers
    - Attendance fields are available only when attendance tracking is enabled
    - Admins can define custom fields (text, text area, select, number) per event
    - Field configuration includes: label, type, required/optional, display order
    - Field data is collected per registrant (separate from registration answers)
    - Changes to field data are visible during check-in

  Scenario: Create a custom attendance field
    Given attendance tracking is enabled for an event
    When I add a new attendance field with label "Table" and type "text"
    And I set the field as optional
    And I save the field
    Then the field is created and appears in the field list
    And I can begin collecting this data for attendees

  Scenario: Reorder attendance fields
    Given multiple attendance fields are defined for an event
    When I reorder the field display sequence
    And I save the new order
    Then check-in screens and data entry forms show fields in the new order

  Scenario: Update an attendance field definition
    Given an attendance field already exists
    When I change the field label or required status
    And I save the changes
    Then existing data for that field is preserved
    And the updated definition applies to future data entry

  Scenario: Delete an attendance field
    Given an attendance field is defined
    When I delete the field
    Then new entries cannot collect data for that field
    And existing data for that field is removed

  Scenario: Fill in attendance data for a registered attendee
    Given attendance tracking is enabled for an event
    And custom attendance fields are configured
    And registered attendees exist
    When I open the attendee data entry form
    And I fill in values for configured fields
    And I save the data
    Then the data is stored for that attendee
    And the attendee appears with this data in event-day check-in tools

  Scenario: Update attendance data before event day
    Given an attendee already has saved attendance data
    When I change one or more field values
    And I save the update
    Then the updated data replaces the previous values
    And check-in screens show the latest data

  Scenario: Save attendance data with optional fields left blank
    Given attendance tracking is enabled for an event
    When I save attendance data with only required fields filled in
    Then the data is accepted
    And blank optional fields remain empty

  Scenario: Prevent data collection changes when attendance tracking is disabled
    Given attendance tracking is disabled for an event
    When I open attendance field configuration or data entry
    Then field editing actions are unavailable
    And I see guidance to enable attendance first

  Scenario: View attendance data summary for event preparation
    Given multiple attendees have saved attendance data
    When I open the data entry list view
    Then I can review collected data per attendee
    And I can quickly identify attendees with incomplete data

# Implementation Notes (MVP2 Session 1)

## Decision: ASM-003 — Dynamic Attendance Fields

Previous design proposed fixed assignment columns: table, area, team color, area leader.
Resolved decision: Assignment fields are now fully dynamic (admin-configurable), mirroring the event-fields pattern.
- Admins define field schema (label, type, required/optional, display order)
- Field types supported in MVP2: text, textarea, select, number
- All field data stored in attendance_field_answers table (separate from registration_answers)

## Decision: Slice S3 Semantic — Attendance Field Configuration

The slice is named "Attendance Field Configuration" (not "Assignment Field Builder") to reflect that:
- The underlying pattern is configuring what attendance data to collect per event
- This pattern is not limited to "assignments" conceptually, though MVP2 initially uses it for check-in context data
- Future MVP iterations could apply this field configuration pattern to other attendance-scoped data collection needs

## Implementation Scope: Slice S3

This feature is implemented across Slice S3 (EPIC-8-S3) in MVP2:
- Part 1: Field configuration UI — admins create/edit/delete/reorder fields
- Part 2: Data entry UI — admins fill in field values per registrant
- Backend: attendance_field_* tables, attendance_field_* Edge Functions, dynamic Zod schema validation
- Query path: Check-in displays collected field data alongside registration details (see feature 8.3)
