Feature: Cancel Registration
  As an admin
  I want to cancel a member's registration for an event
  So that I can manage attendance if a member cannot attend or is not eligible

  Context: Business Rules
    - Only active registrations (Submitted or Updated status) can be cancelled
    - Already cancelled registrations cannot be cancelled again
    - Cancellation requires confirmation to prevent accidental loss
    - Cancelled registration is preserved in database (not deleted); status changes to "Cancelled"
    - Cancellation is available from list row actions and registration detail view
    - If event is archived, cancellation is not allowed

  Scenario: Cancel an active registration
    Given I'm viewing an active registration (Submitted or Updated status)
    When I click "Cancel Registration"
    Then a confirmation dialog appears asking: "Are you sure you want to cancel this registration?"
    And I see buttons: "Cancel" (dismiss) and "Cancel Registration"
    And I click "Cancel Registration"
    Then registration status changes to Cancelled
    And I see success message: "Registration cancelled successfully"

  Scenario: Dismiss cancellation confirmation
    Given I see the cancel confirmation dialog
    When I click "Cancel" button (dismiss, not confirm)
    Then the dialog closes
    And registration remains active (not cancelled)
    And no changes are made

  Scenario: Cancelled registration shows in list
    Given I've cancelled a registration
    When I return to the registrations list
    Then the registration now shows status: "Cancelled"
    And it appears with a visual indicator (badge, strikethrough, etc.)
    And "Cancel" button is now hidden/disabled
    And "Reactivate" button is now available

  Scenario: View cancelled registration detail
    Given a registration is cancelled
    When I navigate to its detail page
    Then all information is shown (member info and responses preserved)
    And status clearly shows: "Cancelled"
    And "Reactivate" button is available
    And "Cancel" button is disabled/hidden

  Scenario: Cannot cancel already cancelled registration
    Given a registration is already in Cancelled status
    When I view its detail page
    And I look for the "Cancel" button
    Then "Cancel" button is not available or is disabled
    And I only see "Reactivate" option

  Scenario: Member sees cancelled registration
    Given a registration is cancelled
    When the member looks up their registration (if they have access to view past registrations)
    Then they see their registration with status: "Cancelled"
    And they can reactivate it if allowed
    And their responses are preserved

  Scenario: Cannot cancel when event is archived
    Given an event is archived
    When I view registrations for that event
    Then Cancel action is disabled
    And I can still view registration details
