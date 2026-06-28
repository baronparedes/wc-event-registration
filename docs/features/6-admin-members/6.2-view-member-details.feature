Feature: View and Edit Member Details
  As an admin
  I want to view and edit a member's complete profile
  So that I can maintain accurate member information and update their details

  Context: Business Rules
    - Member profile fields: ID (read-only), Full Name, First Name, Last Name, Nickname, Email, Phone, Date of Birth, Role, Category
    - Member ID is immutable (cannot change through edit; requires separate "Update ID" flow)
    - Email and phone are validated for format (email is valid email, phone is valid format)
    - Date of Birth is optional
    - Role and Category are optional metadata fields (Attendee, Volunteer, Staff, etc.)
    - Admin can save changes immediately; no publish step needed
    - Form shows dirty state indicator (unsaved changes)
    - Existing registrations link to member profile and are unaffected by profile edits
    - Nickname is a first-class field (not metadata) for display purposes

  Scenario: View member profile details
    Given I'm on a member's detail page
    When the page loads
    Then I see all member information displayed:
      - Member ID (read-only, cannot edit)
      - Full Name (first + last)
      - First Name (separate field)
      - Last Name (separate field)
      - Nickname
      - Email address
      - Phone number
      - Date of Birth
      - Role (optional)
      - Category (optional)
      - Created Date (read-only)
      - Last Modified Date (read-only)

  Scenario: Edit member basic information
    Given I'm viewing a member profile
    When I click "Edit" or the fields become editable
    And I change the member's full name or nickname
    And I click "Save Changes"
    Then the changes are saved immediately
    And I see success message: "Member updated successfully"
    And Last Modified Date updates

  Scenario: Edit email address with validation
    Given I'm editing a member profile
    When I change the email to an invalid format (e.g., "not-an-email")
    And I click "Save Changes"
    Then I see error: "Email must be a valid email address"
    And changes are not saved until fixed

  Scenario: Edit phone number with validation
    Given I'm editing a member profile
    When I change the phone to an invalid format (e.g., "abc123")
    And I click "Save Changes"
    Then I see error message about phone format
    And changes are not saved until corrected

  Scenario: Edit optional fields
    Given I'm editing a member profile
    When I add or update optional fields (Date of Birth, Role, Category)
    And I click "Save Changes"
    Then optional fields are saved
    And I can leave optional fields blank

  Scenario: Cannot edit member ID directly
    Given I'm editing a member profile
    When I look for the Member ID field
    Then it appears as read-only or disabled
    And I see message: "To change Member ID, use the 'Update ID' option"
    And ID field cannot be edited from this form

  Scenario: See unsaved changes indicator
    Given I'm editing a member profile
    When I make a change to any field
    Then I see "unsaved changes" indicator (e.g., "*" or warning)
    And Save button becomes active/enabled
    And if I navigate away, I get a confirmation: "Discard unsaved changes?"

  Scenario: Discard changes and revert
    Given I've made edits to a member profile
    When I click "Cancel" or "Discard Changes"
    Then the form reverts to last saved state
    And all edits are lost
    And member profile unchanged

  Scenario: Edit member role and category
    Given I'm editing a member profile
    When I change Role (e.g., from "Attendee" to "Volunteer")
    And Category (e.g., from "Participant" to "Organizer")
    And I click "Save Changes"
    Then new role and category are saved
    And existing registrations still link to same member (not affected)

  Scenario: See registrations linked to member
    Given I'm viewing a member profile
    When the page shows member details
    Then I may see a section: "Recent Registrations" or link to "View All Registrations for This Member"
    And I can click to see all events this member has registered for

  Scenario: Date of Birth field
    Given I'm editing a member profile
    When I add or change the Date of Birth
    And I select a valid date from date picker
    And I click "Save Changes"
    Then date is saved
    And date displays in readable format

  Scenario: Bulk email edit (if available)
    Given multiple members exist and I'm viewing one
    If I'm in a bulk edit mode:
      - I can apply same email domain to multiple members
      - Or other bulk operations
      - With confirmation before applying

  Scenario: View member's activity (optional)
    Given I'm on a member profile
    When I look for activity or audit information
    Then I may see: Created date, Last modified date, Last registration date
    And optionally: login/access history if tracked

  Scenario: Delete member (if allowed)
    Given I'm viewing a member profile
    When I look for delete option
    Then I may see a "Delete Member" button
    And clicking it requires confirmation
    And Member's registrations may be preserved (depending on system design)
