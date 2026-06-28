Feature: Update Member ID
  As an admin
  I want to change a member's ID (RFID or identifier)
  So that I can correct IDs or handle membership card replacements

  Context: Business Rules
    - Member ID is normally immutable after creation
    - Update ID flow provides a dedicated interface for changing it
    - New ID must be unique (no duplicates)
    - Old ID is no longer valid for lookups after update
    - New ID immediately applies to all future registrations and lookups
    - Existing registrations remain unchanged (linked by member database ID, not member ID)
    - Update history optionally tracked for audit trail
    - Operation requires confirmation to prevent accidental changes

  Scenario: Update member's ID successfully
    Given I'm viewing a member with current ID "1324250891"
    When I click "Update Member ID"
    Then an "Update ID" dialog appears showing:
      - Current ID: "1324250891" (read-only)
      - New ID: (empty input field)
    And I enter new ID "1324250892"
    And I click "Confirm Update"
    Then member's ID changes to "1324250892"
    And I see success message: "Member ID updated successfully"

  Scenario: Fail to update with duplicate ID
    Given a member has ID "1324250891"
    And another member already has ID "1324250892"
    When I try to update first member to "1324250892"
    Then I see error: "This ID is already in use"
    And update fails
    And I'm prompted to choose a different ID

  Scenario: Fail to update with blank ID
    Given the Update ID dialog is open
    When I leave the new ID field empty
    And I click "Confirm Update"
    Then I see error: "New ID cannot be empty"
    And update fails

  Scenario: Confirm before updating ID
    Given I see the Update ID dialog
    And I enter a new ID
    When I click "Confirm Update"
    Then a confirmation dialog appears: "Are you sure you want to change this member's ID from 'X' to 'Y'? This cannot be easily undone."
    And I can click "Confirm" or "Cancel"

  Scenario: Cancel ID update
    Given I've opened the Update ID dialog
    When I click "Cancel"
    Then the dialog closes
    And member's ID remains unchanged

  Scenario: Old ID no longer works for lookup after update
    Given a member's ID was updated from "1324250891" to "1324250892"
    When a member enters old ID "1324250891" in registration lookup
    Then lookup fails: "Member not found"
    And member must use new ID "1324250892"

  Scenario: New ID immediately works for registration
    Given a member's ID is updated to "1324250892"
    When a member enters this new ID in registration lookup
    Then lookup succeeds
    And member profile appears

  Scenario: Existing registrations unaffected by ID change
    Given a member has ID "1324250891" and existing registrations
    When I update their ID to "1324250892"
    Then existing registrations remain linked to the member
    And registrations appear when viewing member's registration history
    And member's name/profile remains same in registrations

  Scenario: Multiple ID updates for same member
    Given a member's ID was changed before
    When I update it again
    Then only the most recent ID works
    And all previous IDs no longer work for lookup
    And multiple updates are allowed (if operationally needed)

  Scenario: ID update tracked for audit
    Given I've updated a member's ID
    When I view member details
    Then I see: Last Modified Date has updated
    And optionally: audit log shows "ID changed from X to Y on [date]"

  Scenario: Batch ID updates (if available)
    Given multiple members need ID updates
    When I access bulk operations
    Then I may see option to "Update IDs" for multiple members
    And I can bulk upload old→new ID mappings
    And each change requires confirmation

  Scenario: ID format validation
    Given the system has rules for valid ID format
    When I try to update to an invalid format ID
    Then I see error about format requirement
    And update fails

  Scenario: Contact admin if ID already used
    Given I'm trying to update ID but new ID is already in use
    When I see "ID already in use" error
    Then I can click "Contact Admin" or similar if conflict cannot be resolved
    And admin can manually investigate duplicate ID issue
