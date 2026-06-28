Feature: View Registration Details
  As an admin
  I want to view the complete details of a single registration
  So that I can see all member information and their event responses

  Context: Business Rules
    - Registration detail shows complete member profile and all field responses
    - Member information shown: ID (read-only), Full Name, Email, Phone, Nickname, Role, Category, Date of Birth
    - Registration metadata shown: Status (Submitted/Updated/Cancelled), Submission Date, Last Updated Date
    - Field responses shown in same format as on registration form (not raw data)
    - Status history optionally shows (if tracking is enabled)
    - Admin cannot edit registration responses directly (view-only mode)
    - Navigation back to registrations list available
    - Actions available based on status: Cancel (if active), Reactivate (if cancelled), View PDF (optional)

  Scenario: View complete registration details
    Given I'm on a registration
    When the detail page loads
    Then I see full member information: ID, full name, email, phone, nickname, role, category
    And I see registration metadata: status, submitted date, last modified date
    And I see all field responses organized by field label with readable values

  Scenario: See field responses formatted correctly
    Given a registration with various field types (text, select, multi-select, date, etc.)
    When I view the detail page
    Then each field response displays formatted correctly:
      - Select fields show the selected label (not raw value)
      - Multi-select fields show all selected options
      - Date fields show in readable format (e.g., "June 28, 2026")
      - Checkboxes show as "Yes" or "No"
      - Text fields show as entered

  Scenario: View cancelled registration
    Given a registration with Cancelled status
    When I view its detail page
    Then I see all information as normal
    And status clearly shows: "Cancelled"
    And "Reactivate" button is available
    And "Cancel" button is not available

  Scenario: View updated registration
    Given a member updated their registration responses
    When I view the registration detail
    Then I see the current (most recent) responses
    And status shows: "Updated"
    And submission date is original; last updated date is recent

  Scenario: See registration action buttons
    Given I'm viewing a registration detail
    When the page loads
    Then I see action buttons at bottom or side:
      - "Cancel Registration" (if status is Submitted/Updated)
      - "Reactivate Registration" (if status is Cancelled)
      - "Back to Registrations" link
      - Optional: "View History" or "View PDF"

  Scenario: Navigate back to registrations list
    Given I'm on a registration detail page
    When I click "Back to Registrations"
    Then I return to the registrations list
    And my previous filters/search selections are preserved

  Scenario: Empty field responses show appropriately
    Given a registration where some optional fields were left blank
    When I view the detail page
    Then empty fields appear with "(not provided)" or similar indicator
    And empty fields do not show error state (blank is valid for optional fields)

  Scenario: View member profile link
    Given I'm viewing a registration detail
    When I see the member ID or member name
    And I click it (if clickable)
    Then I may navigate to view/edit the member's full profile
    And I can return to the registration detail

  Scenario: See submission timeline
    Given a registration has been submitted and updated
    When I view the detail page
    Then I see timestamps: Original submission date and last updated date
    And if history tracking exists, I see entry for each submission

  Scenario: Field responses match event configuration
    Given an event's field configuration
    When I view a registration's responses
    Then all responses shown match the field order from the event
    And all field labels match the configured labels
    And responses are complete (no skipped fields)

  Scenario: View read-only member information
    Given I'm on a registration detail page
    When I look at member fields (ID, name, email, etc.)
    Then all fields appear as read-only/non-editable
    And I cannot modify registration responses from this view
    And message or UI indicates this is a read-only view
