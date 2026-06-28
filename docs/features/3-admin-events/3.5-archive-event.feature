Feature: Archive Event
  As an admin
  I want to archive a published event to remove it from public view
  So that completed or cancelled events are no longer available for registration

  Context: Business Rules
    - Only published events can be archived; draft events cannot be archived (just deleted)
    - Archived events become invisible on public homepage
    - Archived events show as read-only to admins (cannot edit or un-archive)
    - Existing registrations for archived events are preserved (audit trail)
    - Members can view archived event details and their past registrations (read-only)
    - Archiving is permanent in current version (no un-archive capability)
    - Archive action requires confirmation to prevent accidental loss
    - Archived event shows "Archived" badge on admin events list

  Scenario: Archive a published event with confirmation
    Given I'm viewing a published event
    When I click "Archive Event"
    Then a confirmation dialog appears asking: "Are you sure you want to archive this event? This cannot be undone."
    And I see buttons: "Cancel" and "Archive"
    And I click "Archive" to confirm
    Then event status changes to Archived
    And I see success message: "Event archived successfully"

  Scenario: Cancel archive operation
    Given I see the archive confirmation dialog
    When I click "Cancel"
    Then the dialog closes
    And event remains Published
    And no changes are made

  Scenario: Archived event disappears from public view
    Given I've archived an event
    When a public user visits the homepage
    Then this event no longer appears in any category (Open, Upcoming, Past)
    And public cannot access registration for this event

  Scenario: View archived event details as admin
    Given an event is Archived
    When I navigate to its details page
    Then I see the event information displayed as read-only
    And all fields are disabled (no Edit button)
    And status shows "Archived"
    And I see buttons: View Fields, View Registrations
    And Edit and Archive buttons are not available

  Scenario: View existing registrations for archived event
    Given an event is Archived
    When I click "View Registrations"
    Then I see all existing registrations for that event
    And registrations are read-only (no Cancel/Reactivate actions available)
    And member data and responses are preserved

  Scenario: Archived event shows in admin list with badge
    Given an event is Archived
    When I view the admin events list
    Then I see this event with an "Archived" status badge
    And available actions are: View Details, View Fields, View Registrations only
    And Edit, Publish, Archive buttons are not shown

  Scenario: Archive event preserves all historical data
    Given an event has registrations, field configurations, and audit logs
    When I archive the event
    Then all historical data is preserved:
      - Registrations remain intact
      - Field configurations remain unchanged
      - Event details remain unchanged
    And no data is deleted, only visibility is removed

  Scenario: Draft event delete (not archive)
    Given an event is still in Draft status
    When I click event actions
    Then "Archive" button is not available
    And I may see a "Delete" option instead
    And deleting a draft removes it without going through archive

  Scenario: Member views archived event (read-only)
    Given an event is Archived
    And a member previously registered for it
    When the member looks up their registration
    Then they see: "This event is no longer available" or similar
    And they can view their past registration in read-only mode
    And they cannot modify or cancel their registration
