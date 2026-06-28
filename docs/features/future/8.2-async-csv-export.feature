Feature: Asynchronous CSV Export for Large Registrations
  As an admin exporting large event registrations
  I want exports to be processed asynchronously
  So that the UI remains responsive and export quality doesn't degrade with dataset size

  Context: Business Rules (Planned)
    - Current: CSV export is synchronous (blocks UI, times out on large datasets)
    - Future: CSV export is asynchronous with job queue
    - Export request stored as job; status shown to admin
    - Admin can continue working while export generates in background
    - Completed exports available for download in "Export History" section
    - Export jobs expire after 7 days (auto-cleanup)
    - Email notification sent to admin when export ready (optional)
    - Bulk exports supported: single event, date range, or across all events
    - Progress bar/status shown for in-progress exports
    - Failed exports show error reason and option to retry

  Scenario: Export large dataset asynchronously
    Given I'm exporting 50,000+ registrations for an event
    When I click "Export as CSV"
    Then I see: "Export queued. You'll be notified when ready."
    And export job status shown: "Generating... (Estimated 2 minutes)"
    And I can continue using the admin dashboard

  Scenario: Download completed export
    Given an export has completed
    When I navigate to Exports section or click notification
    Then I see list of completed exports
    And I can click "Download" to save CSV file
    And filename shows: event_registrations_2026-06-28.csv

  Scenario: Export status and progress
    Given I've requested an export
    When I check Export History
    Then I see status: "In Progress (45% complete)" or "Ready for Download"
    And older exports show status: "Downloaded" or "Expired"

  Scenario: Email notification on export ready
    Given I've requested an export
    And notifications enabled in preferences
    When the export completes
    Then I receive email: "Your event registrations export is ready"
    And email contains download link (valid for 7 days)

  Scenario: Export expired after 7 days
    Given an export completed 7 days ago
    When I view Export History
    Then the export status shows: "Expired"
    And download link no longer works
    And I must request a new export

  Scenario: Cancel in-progress export
    Given an export is in progress
    When I click "Cancel"
    Then the job is terminated
    And partial file is discarded
    And I can request a new export

  Scenario: Bulk export across multiple events
    Given multiple events selected or date range specified
    When I click "Export All"
    Then system creates single CSV with all registrations
    And "Event Name" column identifies which registration belongs to which event
    And export is queued asynchronously

  Scenario: Error handling for failed exports
    Given an export fails (e.g., database connection lost)
    When the export completes
    Then status shows: "Failed"
    And error reason displayed: "Database error. Please try again."
    And "Retry" button available to re-queue export

  Scenario: Multiple concurrent exports
    Given I request multiple exports (different events)
    When exports are queued
    Then system processes them in order
    And each shows its own progress
    And UI shows count: "2 exports in progress"

  Scenario: Export retention policy
    Given old exports exist in the system
    When retention period expires (7 days)
    Then old exports auto-delete
    And storage is cleaned up
    And admin cannot access deleted exports
