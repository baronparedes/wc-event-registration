Feature: Export Registrations to CSV
  As an admin
  I want to export all event registrations as a CSV file
  So that I can analyze data, share with stakeholders, or import into other systems

  Context: Business Rules
    - Export includes all registrations (active, updated, and cancelled) with status clearly marked
    - CSV includes: Member ID, Full Name, Email, Phone, Role, Category, Registration Status, Submitted Date, all field responses
    - Field responses are formatted as human-readable values (labels, not raw codes or JSON)
    - Export is triggered from the registrations list page
    - CSV filename includes event slug and export date: "event-slug_registrations_YYYY-MM-DD.csv"
    - Export is rate-limited to prevent abuse (one export per admin per minute from same IP)
    - Cancelled registrations included with status marked as "Cancelled"
    - Export data matches current event configuration (field order, labels)

  Scenario: Export registrations as CSV
    Given I'm viewing registrations list for an event
    When I click "Export as CSV"
    Then a CSV file is generated
    And the file is automatically downloaded
    And filename format: "event-slug_registrations_2026-06-28.csv"

  Scenario: CSV includes all required columns
    Given a CSV has been generated
    When I open the file in a spreadsheet
    Then I see columns: Member ID, Full Name, Email, Phone, Role, Category, Registration Status, Submitted Date, [all field responses]
    And data is properly formatted for spreadsheet tools

  Scenario: Member information in CSV
    Given registrations exist with member data
    When I export to CSV
    Then each row includes:
      - Member ID (as entered in system)
      - Full Name
      - Email address
      - Phone number
      - Role and Category (from member profile)

  Scenario: Field responses formatted correctly in CSV
    Given registrations with various field types (select, multi-select, date, text, etc.)
    When I export to CSV
    Then each field response shows formatted label/value:
      - Select fields show the selected option label
      - Multi-select shows comma-separated selected options
      - Date fields show in readable format (MM/DD/YYYY)
      - Checkboxes show as Yes/No or True/False
      - Text fields show as entered
      - Empty optional fields show blank

  Scenario: Cancelled registrations included in export
    Given registrations include some cancelled status
    When I export to CSV
    Then cancelled registrations are included in rows
    And Status column shows "Cancelled" for these rows
    And all their data (member info and responses) is preserved in export

  Scenario: Updated registrations show current responses
    Given registrations where member updated their responses
    When I export to CSV
    Then the export shows current (most recent) responses
    And Status column shows "Updated"
    And only latest version of responses appear (not multiple versions)

  Scenario: Export timestamp
    Given I'm exporting registrations
    When I view the downloaded file
    Then filename includes today's date: "event-slug_registrations_2026-06-28.csv"
    And export reflects registrations as of export time

  Scenario: Export is rate-limited
    Given I've just exported registrations
    When I immediately try to export again
    Then I see message: "Export in progress. Please wait before requesting another export."
    And I must wait (e.g., 1 minute) before exporting again
    And this prevents accidental duplicate requests

  Scenario: Export with no registrations
    Given an event has no registrations
    When I click "Export as CSV"
    Then a CSV file is still generated
    And file contains only headers (column names)
    And file is empty except for header row

  Scenario: Large export handles many registrations
    Given an event has 1000+ registrations
    When I click "Export as CSV"
    Then export completes successfully
    And all registrations are included (not truncated)
    And file download works for large file size
    And file is ready within reasonable time (< 30 seconds)

  Scenario: Cancelled registrations can be identified in export
    Given export includes active and cancelled registrations
    When I open the CSV in spreadsheet and sort by Status
    Then I can easily filter/group by Status column
    And Cancelled registrations appear as separate group
    And I can process them separately if needed

  Scenario: Export respects current filters/search
    Given I have filtered registrations (e.g., Status = "Submitted", searched by name)
    When I click "Export as CSV"
    Then the export includes all registrations (not just filtered view)
    And all registrations for the event are exported
    And filtering is for display only, not export scope
