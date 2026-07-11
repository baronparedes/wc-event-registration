Feature: Configure Attendance Settings Per Event
  As an admin
  I want to enable or disable attendance options for each event
  So that event-day tools are only available when needed

  Context: Business Rules
    - Attendance tracking is disabled by default for new events
    - Attendance settings are managed per event
    - Timeslot attendance is optional and can be toggled per event
    - Event settings changes are saved immediately when confirmed

  Scenario: Enable attendance tracking for an event
    Given I am managing an event in admin
    And attendance tracking is currently disabled
    When I enable attendance tracking
    Then attendance tools become available for that event
    And I see confirmation that attendance is enabled

  Scenario: Enable timeslot attendance for an attendance-enabled event
    Given attendance tracking is enabled for an event
    And timeslot attendance is currently disabled
    When I enable timeslot attendance
    Then timeslot attendance options become available
    And I see confirmation that timeslot tracking is enabled

  Scenario: Prevent timeslot toggle when attendance is disabled
    Given attendance tracking is disabled for an event
    When I try to enable timeslot attendance
    Then I am prompted to enable attendance tracking first
    And the dependent toggle is not applied

  Scenario: Save updated attendance settings
    Given I changed one or more attendance settings
    When I save my changes
    Then the new settings are stored for that event
    And reopening the event shows the same saved settings
