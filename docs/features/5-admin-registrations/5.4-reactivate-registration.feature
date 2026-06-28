Feature: Reactivate Registration
  As an admin
  I want to restore a cancelled registration back to active status
  So that a member can attend again or to correct a mistaken cancellation

  Context: Business Rules
    - Only cancelled registrations can be reactivated
    - Reactivating changes status back to "Submitted" or "Updated" (whichever was original)
    - Reactivation requires confirmation to prevent accidental restoration
    - Reactivation restores member's registration spot
    - Reactivation is timestamped and tracked for audit trail
    - Reactivated registration shows updated timestamp
    - Member can now see their registration as active again
    - Reactivation may trigger notification to member (if enabled)
    - Admin can optionally add notes when reactivating

  Scenario: Reactivate a cancelled registration
    Given I'm viewing a cancelled registration
    When I click "Reactivate Registration"
    Then a confirmation dialog appears: "Are you sure you want to reactivate this registration?"
    And I can optionally enter a reason/note for reactivation
    And I see buttons: "Cancel" (dismiss) and "Confirm Reactivation"
    And I click "Confirm Reactivation"
    Then registration status changes back to active (Submitted or Updated)
    And I see success message: "Registration reactivated successfully"

  Scenario: Reactivate without providing reason
    Given I see the reactivate confirmation dialog
    When I click "Confirm Reactivation" without entering a reason
    Then reactivation proceeds
    And reason field can be empty (optional)

  Scenario: Reactivate with reason/notes
    Given the reactivate confirmation dialog is open
    When I enter a reason like "Mistaken cancellation - member will attend"
    And I click "Confirm Reactivation"
    Then reactivation is recorded with the reason
    And reason is visible in registration history/audit log

  Scenario: Dismiss reactivation confirmation
    Given I see the reactivate confirmation dialog
    When I click "Cancel" button (dismiss)
    Then the dialog closes
    And registration remains cancelled
    And no changes are made

  Scenario: Reactivated registration shows in list as active
    Given I've reactivated a registration
    When I return to the registrations list
    Then the registration now shows status: "Submitted" or "Updated" (active)
    And it no longer appears with cancelled indicator
    And "Reactivate" button is now hidden
    And "Cancel" button is now available again

  Scenario: View reactivated registration detail
    Given a registration has been reactivated
    When I navigate to its detail page
    Then status shows: "Submitted" or "Updated" (active)
    And "Cancel" button is available
    And "Reactivate" button is disabled/hidden
    And all member info and responses are unchanged

  Scenario: Cannot reactivate an active registration
    Given a registration is already in Submitted or Updated status
    When I view its detail page
    Then "Reactivate" button is not available or is disabled
    And I only see "Cancel" option

  Scenario: Reactivation restores member's registration spot
    Given an event with limited spots or capacity
    When I reactivate a previously cancelled registration
    Then the member's spot is restored
    And active registration count increases
    And cancelled registration count decreases

  Scenario: Member sees reactivated registration as active
    Given a registration is reactivated
    When the member looks up their registration
    Then they see status as: "Submitted" or "Updated"
    And their registration appears active
    And they can potentially register again or update responses (based on event duplicate policy)

  Scenario: Reactivation updates timestamp
    Given a registration is reactivated
    When I view the registration detail
    Then I see: Last updated date is now the reactivation time
    And original submission date is preserved
    And history shows both cancellation and reactivation events

  Scenario: Cannot reactivate if event is archived
    Given an event is archived
    When I view a cancelled registration for that event
    Then "Reactivate" button may be disabled
    And message: "Cannot reactivate registrations for archived events"
    And admin can view but not modify archived event registrations
