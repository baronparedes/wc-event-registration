Feature: Cancel Registration
  As an admin
  I want to cancel a member's registration for an event
  So that I can manage attendance if a member cannot attend or is not eligible

  Context: Business Rules
    - Only active registrations (Submitted or Updated status) can be cancelled
    - Already cancelled registrations cannot be cancelled again
    - Cancellation requires confirmation to prevent accidental loss
    - Cancelled registration is preserved in database (not deleted); status changes to "Cancelled"
    - Member can still see their cancelled registration (read-only)
    - Member can reactivate their own cancelled registration or admin can reactivate for them
    - Cancellation is timestamped for audit trail
    - Admin can see reason/notes for cancellation (optional field)
    - Cancellation triggers notification to member (if enabled)

  Scenario: Cancel an active registration
    Given I'm viewing an active registration (Submitted or Updated status)
    When I click "Cancel Registration"
    Then a confirmation dialog appears asking: "Are you sure you want to cancel this registration?"
    And I can optionally enter a reason/note for cancellation
    And I see buttons: "Cancel" (dismiss) and "Confirm Cancellation"
    And I click "Confirm Cancellation"
    Then registration status changes to Cancelled
    And I see success message: "Registration cancelled successfully"

  Scenario: Cancel without providing reason
    Given I see the cancel confirmation dialog
    When I click "Confirm Cancellation" without entering a reason
    Then cancellation proceeds
    And reason field can be empty (optional)

  Scenario: Cancel with reason/notes
    Given the cancel confirmation dialog is open
    When I enter a reason like "Member is no longer attending"
    And I click "Confirm Cancellation"
    Then cancellation is recorded with the reason
    And reason is visible in registration history/audit log

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

  Scenario: Cancellation affects attendance count
    Given an event with registrations
    When I cancel a registration
    Then event's active registration count decreases by 1
    And cancelled registration count increases by 1 (if tracked)

  Scenario: Cancellation is permanent in current state
    Given a registration is cancelled
    When I view it later
    Then the cancellation record remains
    And admin cannot "un-cancel" (only "Reactivate" which is different state change)
    And status history shows cancellation with timestamp
