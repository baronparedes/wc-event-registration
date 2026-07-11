Feature: Export Attendance Data As CSV
  As an admin
  I want to export attendance data separately from registration export
  So that post-event attendance reporting stays clear and operationally useful

  Context: Business Rules
    - Attendance export is a separate report from registration export
    - Export is available only for events with attendance tracking enabled
    - CSV includes attendee identity, attendance status, official check-in time, and assignment details
    - Export supports events with no attendance records by returning headers

  Scenario: Export attendance CSV for an attendance-enabled event
    Given attendance tracking is enabled for an event
    And attendance records exist
    When I click "Export attendance CSV"
    Then a dedicated attendance CSV file is generated
    And the file is downloaded successfully

  Scenario: Attendance CSV includes required columns
    Given I exported attendance CSV
    When I open the file
    Then I see attendee identity columns
    And I see attendance status and official check-in time columns
    And I see assignment detail columns

  Scenario: Export with no attendance records
    Given attendance tracking is enabled for an event
    And no attendees have been checked in
    When I export attendance CSV
    Then the file is still generated
    And the file contains only column headers

  Scenario: Keep attendance export independent from registration export
    Given I can export both registration and attendance reports
    When I export attendance data
    Then the generated file follows attendance report rules
    And registration export behavior remains unchanged

  Scenario: Hide attendance export when attendance tracking is disabled
    Given attendance tracking is disabled for an event
    When I open event operations pages
    Then attendance export action is not available
    And I see no attendance reporting entry points
