Feature: Reactivate Registration
  As an admin
  I want to restore a cancelled registration back to active status
  So that a member can attend again or to correct a mistaken cancellation

  Context: Business Rules
    - Only cancelled registrations can be reactivated
    - Reactivating changes status back to active
    - Reactivation requires confirmation to prevent accidental restoration
    - Reactivation is available from list row actions and registration detail view
    - If event is archived, reactivation is not allowed

  Scenario: Reactivate a cancelled registration
    Given I'm viewing a cancelled registration
    When I click "Reactivate Registration"
    Then a confirmation dialog appears: "Are you sure you want to reactivate this registration?"
    And I see buttons: "Cancel" (dismiss) and "Reactivate Registration"
    And I click "Reactivate Registration"
    Then registration status changes back to active
    And I see success message: "Registration reactivated successfully"

  Scenario: Dismiss reactivation confirmation
    Given I see the reactivate confirmation dialog
    When I click "Cancel" button (dismiss)
    Then the dialog closes
    And registration remains cancelled
    And no changes are made

  Scenario: Reactivated registration shows in list as active
    Given I've reactivated a registration
    When I return to the registrations list
    Then the registration now shows active status
    And it no longer appears with cancelled indicator
    And "Reactivate" button is now hidden
    And "Cancel" button is now available again

  Scenario: View reactivated registration detail
    Given a registration has been reactivated
    When I navigate to its detail page
    Then status shows active
    And "Cancel" button is available
    And "Reactivate" button is disabled/hidden
    And all member info and responses are unchanged

  Scenario: Cannot reactivate an active registration
    Given a registration is already in Submitted or Updated status
    When I view its detail page
    Then "Reactivate" button is not available or is disabled
    And I only see "Cancel" option

  Scenario: Cannot reactivate if event is archived
    Given an event is archived
    When I view a cancelled registration for that event
    Then "Reactivate" button is disabled
    And message: "Cannot reactivate registrations for archived events"
    And admin can view but not modify archived event registrations
