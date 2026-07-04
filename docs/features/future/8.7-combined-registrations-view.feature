Feature: Combined Registrations View
  As an admin managing an event with both member and public registrations
  I want to view all attendees in a single unified list
  So that I can reduce navigation friction and manage registrations more efficiently

  Background:
    Given an event has both member registrations and public guest registrations
    And the Registrations page is the primary admin interface for managing attendees

  Scenario: View all attendees in a single sorted list
    When I navigate to the Registrations page
    Then I see all attendees (members and guests) combined in one table
    And attendees are sorted alphabetically by full name
    And each row clearly indicates whether the attendee is a member or guest

  Scenario: Search across all registration types
    Given the Registrations page displays combined member and public registrations
    When I search for an attendee by name, email, or member ID
    Then results include matches from both member and public registration tables
    And search results are sorted alphabetically
    And search applies to all searchable fields (name, email, phone, member ID)

  Scenario: View registration details from combined list
    Given I'm viewing the combined registrations list
    When I click on a member registration row
    Then the member registration detail page opens
    And the URL is `/admin/events/{eventId}/registrations/{memberId}`

  Scenario: View public registration details from combined list
    Given I'm viewing the combined registrations list
    When I click on a guest registration row
    Then the guest registration detail page opens
    And the URL is `/admin/events/{eventId}/public-registrations/{publicRegistrationId}`

  Scenario: Pagination across combined dataset
    Given the event has more attendees than the page size limit
    When I navigate through pages
    Then the paginator works correctly across the combined dataset
    And each page displays registrations from both member and public tables
    And page counts reflect total attendees (members + guests)

  Scenario: Export includes both registration types
    Given I'm viewing the combined registrations list
    When I export the registrations to CSV
    Then the export includes both member and public registrations
    And each row has a column indicating registration type (Member or Guest)
    And member rows include member_id, role, and category
    And guest rows include all their available fields

  Scenario: Display handles missing fields gracefully
    When viewing the combined list
    Then member rows show member_id, role, and category
    And guest rows show a placeholder (—) for unavailable fields (member_id, role, category)
    And all rows show commonly available fields (name, email, submitted date)
