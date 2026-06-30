Feature: Cancel Public Registration
  As an admin
  I want to cancel an active public self-registration
  So that I can manage attendance and correct invalid submissions

  Context: Business Rules
    - Only active public registrations can be cancelled
    - Cancellation requires confirmation
    - Cancellation updates status to Cancelled without deleting the record
    - Cancel can be initiated from row actions or detail page
    - After cancellation, available actions switch to Reactivate

  Scenario: Cancel from list actions
    Given I am viewing public registrations
    And a row is in active status
    When I click Cancel and confirm
    Then the registration status becomes Cancelled
    And row actions switch to View and Reactivate

  Scenario: Cancel from detail page
    Given I am on an active public registration detail page
    When I click Cancel Registration and confirm
    Then the registration status becomes Cancelled
    And I can return to the list and see it as Cancelled

  Scenario: Dismiss cancellation
    Given the cancellation confirmation dialog is open
    When I click Cancel
    Then the dialog closes
    And registration status remains unchanged

  Scenario: Event is archived
    Given the event is archived
    When I view public registrations
    Then Cancel is unavailable