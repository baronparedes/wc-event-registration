Feature: View Public Registration Detail
  As an admin
  I want to view a complete public registration record
  So that I can review attendee details and submitted responses

  Context: Business Rules
    - Public registration detail is read-only
    - Detail includes attendee profile fields (name, email, phone, nickname)
    - Detail includes registration metadata (status, submitted date, last updated date)
    - Detail includes all response values in readable format
    - Admin can navigate back to the event's public registrations list
    - Status-based actions are available from detail (Cancel if active, Reactivate if cancelled)

  Scenario: View public registration detail
    Given I am viewing a public registrations list
    When I click View for a row
    Then I see attendee information, registration metadata, and responses
    And values are formatted in a readable way

  Scenario: View cancelled public registration
    Given a public registration is cancelled
    When I open its detail page
    Then status clearly shows Cancelled
    And I see Reactivate Registration
    And I do not see Cancel Registration

  Scenario: Return to public registrations list
    Given I am on a public registration detail page
    When I click Back to Public Registrations
    Then I return to the public registrations list for the same event