Feature: Reactivate Public Registration
  As an admin
  I want to reactivate a cancelled public self-registration
  So that attendees can be restored to active status

  Context: Business Rules
    - Only cancelled public registrations can be reactivated
    - Reactivation requires confirmation
    - Reactivation returns status to active
    - Reactivate can be initiated from row actions or detail page
    - After reactivation, available actions switch back to Cancel

  Scenario: Reactivate from list actions
    Given I am viewing public registrations
    And a row is in Cancelled status
    When I click Reactivate and confirm
    Then the registration status becomes active
    And row actions switch to View and Cancel

  Scenario: Reactivate from detail page
    Given I am on a cancelled public registration detail page
    When I click Reactivate Registration and confirm
    Then the registration status becomes active
    And I can return to the list and see it as active

  Scenario: Dismiss reactivation
    Given the reactivation confirmation dialog is open
    When I click Cancel
    Then the dialog closes
    And registration status remains Cancelled

  Scenario: Event is archived
    Given the event is archived
    When I view public registrations
    Then Reactivate is unavailable