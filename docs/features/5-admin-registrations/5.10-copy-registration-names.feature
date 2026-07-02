Feature: Copy Registration Names for Sharing
  As an admin
  I want to copy registration names and selected details to my clipboard
  So that I can quickly share attendee information in chat, docs, or operational checklists

  Context: Business Rules
    - Copy action is available from the member registrations list page
    - Copy uses all registrations for the event (not only the current paginated page)
    - Admin can choose core fields to include (for example: Full Name, Member ID, Email, Role, Category)
    - Admin can also choose dynamic event answer fields to include in copied output
    - At least one core field is always included so output is never empty
    - Dynamic fields are searchable to help admins find fields quickly in long forms
    - Copied output uses human-readable labels and values
    - If no registrations exist, copy does not produce empty clipboard output and shows a clear message
    - Names payload is cached briefly to reduce repeated requests and avoid rate-limit pressure

  Scenario: Open copy dialog from registrations page
    Given I'm viewing registrations list for an event
    When I click "Copy Names"
    Then a copy dialog opens
    And I see selectable core fields
    And I see dynamic fields section when event answer fields exist

  Scenario: Copy selected core fields only
    Given the copy dialog is open
    And I selected Full Name and Email
    When I click "Copy to Clipboard"
    Then clipboard text includes one line per registration
    And each line includes Full Name and Email
    And no unselected fields are included

  Scenario: Include dynamic answer fields in copied output
    Given the copy dialog is open
    And I selected one or more dynamic fields
    When I copy to clipboard
    Then copied lines include the selected dynamic field labels and values
    And dynamic values align with each registration row

  Scenario: Search dynamic fields inside copy dialog
    Given the copy dialog shows many dynamic fields
    When I type in the dynamic field search box
    Then matching fields remain visible
    And non-matching fields are hidden
    And selected fields count remains visible

  Scenario: Copy uses all event registrations, not current page only
    Given registrations list is paginated
    And I'm currently on page 1
    When I use "Copy Names"
    Then copied output includes registrations from all pages for that event
    And not just records currently visible in the table

  Scenario: No registrations available
    Given an event has no registrations
    When I attempt to copy names
    Then I see a clear message that no registrations are available to copy
    And clipboard content is not replaced with empty output

  Scenario: Repeated copy actions use cached names payload
    Given I opened copy dialog and data has already been loaded
    When I copy again shortly after
    Then copy completes without a full reload of names data
    And response is fast for repeated operations
    And system reduces repeated calls to rate-limited export path
