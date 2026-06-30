Feature: View Event Registrations
  As an admin
  I want to see a paginated list of all registrations for a specific event
  So that I can manage and monitor who has registered

  Context: Business Rules
    - Registrations list shows all member registrations for one event regardless of status (Submitted, Updated, Cancelled)
    - Each row shows: Member ID, Name, Email, Role, Category, Status, Submitted date, and Actions
    - Search supports member name, member ID, and email with debounce
    - Pagination supports page size options 10, 25, and 50
    - Actions are status-based: View plus Cancel for active rows, or View plus Reactivate for cancelled rows
    - If event is archived, row actions that change status are disabled
    - Export as CSV is available on the page
    - Admin can navigate to a dedicated Public Registrations page from this view

  Scenario: View all registrations for an event
    Given I'm on an event's Registrations page
    When the page loads
    Then I see a table of member registrations for that event
    And each row includes member details, status, submitted date, and actions

  Scenario: See active registrations (non-cancelled)
    Given registrations exist with both active and cancelled status
    When I view the registrations list
    Then active rows show View and Cancel actions

  Scenario: See cancelled registrations
    Given registrations with Cancelled status exist
    When I view the registrations list
    Then cancelled rows show View and Reactivate actions
    And cancelled status is visibly labeled

  Scenario: Search registrations by member ID, name, or email
    Given I'm on the registrations list
    When I enter part of a member ID, name, or email in search
    And I wait for debounce
    Then the list filters to matching registrations
    And I can clear search to see all registrations again

  Scenario: Navigate between pages of registrations
    Given more than one page of registrations exists
    When I view page 1
    And I click next page
    Then I navigate to the next page
    And registrations on that page load
    And active search is preserved

  Scenario: Change page size for registrations
    Given I'm viewing the registrations list
    When I click the page size dropdown
    And I select a size from 10, 25, or 50
    Then the page reloads showing 50 registrations
    And pagination controls update

  Scenario: No registrations yet
    Given an event has no registrations
    When I navigate to the Registrations page
    Then I see an empty state message
    And message: "No registrations yet"
    And CSV Export button may be disabled (nothing to export)

  Scenario: Export all registrations to CSV
    Given registrations exist for this event
    When I click "Export as CSV"
    Then a CSV file is generated and downloaded
    And filename includes event name or event identifier and export date
    And CSV includes: Member ID, Name, Email, Role, Category, Status, all field responses
    And cancelled registrations are included with status marked

  Scenario: Archived event disables status-changing actions
    Given the event is archived
    When I view the registrations list
    Then Cancel and Reactivate actions are disabled
    And View remains available
