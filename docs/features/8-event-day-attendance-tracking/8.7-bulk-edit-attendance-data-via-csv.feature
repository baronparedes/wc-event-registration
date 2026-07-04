Feature: Bulk Edit Attendance Data via CSV
  As an admin with many attendees to prepare
  I want to download an attendance template CSV, bulk edit locally, and upload to apply changes
  So that I can efficiently update attendance field answers for 100s of attendees at once

  Context: Business Rules
    - Bulk edit applies only to attendance field answers (custom event fields like T-shirt size, table assignment)
    - Registration data (name, email, role) cannot be changed via bulk upload
    - CSV template includes all registered attendees for the event
    - CSV template includes all configured attendance fields as columns
    - Bulk upload validates all rows atomically: if any row has errors, entire import is rejected
    - Bulk upload overwrites existing answers for all rows in the file (not merge/partial)
    - Only registered attendees can be bulk edited; walk-ins are not included
    - Bulk upload is available only for events with attendance tracking enabled

  Scenario: Download attendance CSV template for an event
    Given attendance tracking is enabled for an event
    And registered attendees exist for the event
    And custom attendance fields are configured
    When I click "Download Attendance Template"
    Then a CSV file is generated and downloaded
    And the CSV contains all registered attendees as rows
    And the CSV contains columns: registration ID, full name, email, member ID, and one column per attendance field
    And the file is named with event name and timestamp

  Scenario: CSV template shows all attendance fields as columns
    Given I downloaded an attendance CSV template
    When I open the file
    Then each configured attendance field appears as a column header
    And fields are ordered by the configured display order
    And existing attendance answers (if any) are pre-populated in the template

  Scenario: Successfully bulk upload attendance data via CSV
    Given I have a populated attendance CSV template
    And I filled in values for attendance fields
    And all required fields have values
    When I select the file and upload it
    And the system validates all rows
    Then all rows are accepted
    And attendance answers are updated for all attendees in the file
    And I see a confirmation toast showing number of rows processed

  Scenario: Bulk upload validates all rows before accepting
    Given I have a CSV with attendance data
    When I upload the file
    Then the system validates all rows against field requirements and types
    And invalid email formats are rejected
    And missing required field values are rejected
    And invalid select option values are rejected
    And if any row has errors, the entire import is rejected

  Scenario: Bulk upload fails with clear error message
    Given I have a CSV with one invalid row
    When I upload the file
    Then the import is rejected
    And I see an error message indicating which row and which fields have problems
    And I can download the template again, correct the errors, and retry

  Scenario: Bulk upload with empty optional fields
    Given I uploaded a CSV with some optional fields left empty
    When the import completes
    Then rows with empty optional fields are accepted
    And optional fields remain empty for those attendees
    And required fields were all present (validation passed)

  Scenario: Bulk upload is rejected if registration ID is not found
    Given I have a CSV with a registration ID that doesn't belong to this event
    When I upload the file
    Then that row is marked as invalid
    And the entire import is rejected with details about the missing registration

  Scenario: Cannot bulk edit attendance data when attendance tracking is disabled
    Given attendance tracking is disabled for an event
    When I navigate to the attendance data management page
    Then bulk upload and download CSV actions are unavailable
    And I see guidance to enable attendance tracking first

  Scenario: Bulk upload replaces previous attendance answers
    Given attendees already have saved attendance answers
    When I upload a new CSV with different values for those attendees
    Then the new values replace the previous answers
    And all rows in the CSV are overwritten (not merged)

  Scenario: Empty CSV template when no attendees exist
    Given attendance tracking is enabled for an event
    But no attendees have been registered
    When I download the attendance template
    Then the file contains column headers only
    And I see a message indicating there are no attendees to edit
