Feature: View Event Registrations
  As an admin
  I want to see a paginated list of all registrations for a specific event
  So that I can manage and monitor who has registered

  Context: Business Rules
    - Registrations list shows all registrations for a specific event regardless of status (submitted, updated, cancelled)
    - Each registration shows: Member ID, Full Name, Email, Role, Category, Registration Status, Submission Date
    - Registrations are paginated with configurable page size (20, 50, or 100 per page)
    - Admin can search registrations by member ID or member name (with debounce)
    - Admin can filter registrations by status (Submitted, Updated, Cancelled)
    - Registrations are sorted by submission date (newest first by default, optionally changeable)
    - Total registration count displayed
    - Quick-action buttons for each registration: View Details, Cancel, Reactivate (if cancelled), etc.
    - CSV Export button available for entire event's registrations

  Scenario: View all registrations for an event
    Given I'm on an event's Registrations page
    When the page loads
    Then I see a table with all registrations showing:
      - Member ID
      - Full Name
      - Email
      - Role and Category
      - Registration Status (Submitted, Updated, Cancelled)
      - Submission Date and time
      - Action buttons (View Details, Cancel, etc.)

  Scenario: See active registrations (non-cancelled)
    Given registrations exist with both active and cancelled status
    When I view the registrations list
    Then active registrations (Submitted/Updated) show:
      - Full details visible
      - "Cancel" and "View Details" buttons enabled

  Scenario: See cancelled registrations
    Given registrations with Cancelled status exist
    When I view the registrations list
    Then cancelled registrations show:
      - Same details as active (preserved data)
      - Status badge: "Cancelled"
      - "Reactivate" and "View Details" buttons enabled
      - "Cancel" button disabled/hidden (already cancelled)

  Scenario: Search registrations by member ID
    Given I'm on the registrations list
    When I enter a member ID in the search box
    And I wait for debounce (or press Enter)
    Then the list filters to show only matching member ID
    And I can clear search to see all registrations again

  Scenario: Search registrations by member name
    Given I'm on the registrations list
    When I enter a member's name in the search box
    And I wait for debounce
    Then the list filters to show matching registrations by member name
    And partial matches work (e.g., "John" finds "John Smith")
    And search is case-insensitive

  Scenario: Filter by registration status
    Given registrations with mixed statuses exist (Submitted, Updated, Cancelled)
    When I click a status filter (Submitted, Updated, Cancelled)
    Then the list shows only registrations with that status
    And other statuses are hidden
    And filter persists as I navigate pages

  Scenario: Navigate between pages of registrations
    Given more than one page of registrations exists
    When I view page 1
    And I click "Next" or page number button
    Then I navigate to the next page
    And registrations on that page load
    And search/filter selections are preserved

  Scenario: Change page size for registrations
    Given I'm viewing the registrations list
    When I click the page size dropdown
    And I select 50 per page (from options 20, 50, 100)
    Then the page reloads showing 50 registrations
    And pagination controls update
    And my preference is remembered

  Scenario: Sort registrations by submission date
    Given registrations are displayed
    When I click the "Submission Date" column header
    Then registrations sort by date
    And clicking again reverses sort order (newest/oldest)
    And current sort indicator shows on column header

  Scenario: See total registration count
    Given I'm on the registrations list
    Then I see a count display: "Showing X of Y registrations"
    And this reflects current filter/search results

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
    And filename includes event name and export date: "event-slug_registrations_2026-06-28.csv"
    And CSV includes: Member ID, Name, Email, Role, Category, Status, all field responses
    And cancelled registrations are included with status marked
