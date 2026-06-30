Feature: View Public Registrations
  As an admin
  I want to view public self-registrations for a specific event in their own list
  So that I can manage attendees who registered without a member ID

  Context: Business Rules
    - Public self-registrations are shown in a dedicated page separate from member registrations
    - The list is scoped to one event at a time
    - The list includes source, attendee name, email, phone, status, submitted date, and actions
    - Search supports attendee name and email
    - Pagination behavior matches other admin lists (page size control and page navigation)
    - Row actions include View and status-based action (Cancel for active, Reactivate for cancelled)
    - If an event is archived, cancellation and reactivation actions are disabled

  Scenario: Admin opens public registrations list for an event
    Given I am on an event admin page
    When I navigate to Public Registrations
    Then I see only public self-registrations for that event
    And I see columns for source, attendee details, status, submitted date, and actions

  Scenario: Search public registrations by attendee details
    Given I am viewing public registrations
    When I enter part of an attendee name or email in search
    Then the list is filtered to matching rows
    And I can clear search to return to the full list

  Scenario: Paginate public registrations
    Given there are more public registrations than one page
    When I move to the next page
    Then I see the next set of public registrations
    And page controls show the updated page position

  Scenario: Event is archived
    Given the event is archived
    When I view public registrations
    Then I can still view all rows and details
    And Cancel and Reactivate actions are disabled