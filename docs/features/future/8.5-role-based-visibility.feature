Feature: Role-Based Field Visibility
  As an event organizer
  I want to configure which registration fields are visible based on member role
  So that different member types (Staff, Volunteers, Attendees) see/fill different forms

  Context: Business Rules (Planned)
    - Field visibility can be configured per role
    - Roles: Attendee, Volunteer, Staff, Admin (or custom roles)
    - Admin configures during field setup: "Show this field for [role1, role2, role3]"
    - If no roles selected for a field, field is shown to all
    - Member's role determined at lookup time (from member profile)
    - Different member roles see different registration forms for same event
    - Responses only collected for fields visible to that member's role
    - All responses preserved; responses from different roles not compared/mixed
    - Cancellation/reactivation applicable regardless of role

  Scenario: Configure field visibility by role
    Given I'm configuring fields for an event
    When I add a field "Staff Dietary Preferences"
    And I click "Configure Visibility"
    Then I see checkboxes for roles: Attendee, Volunteer, Staff, Admin
    And I select only: Staff, Admin
    And I click "Save"
    Then field only shows to Staff and Admin members

  Scenario: Member with role sees appropriate fields
    Given fields configured:
      - "Name" - visible to all
      - "Dietary Preferences" - visible to all
      - "Staff Training Completion" - visible to Staff only
    When an Attendee member registers
    Then they see: Name, Dietary Preferences
    And do NOT see: Staff Training Completion

  Scenario: Staff member sees additional fields
    Given same event and field configuration
    When a Staff member registers
    Then they see: Name, Dietary Preferences, Staff Training Completion
    And Attendee's additional field is not shown

  Scenario: Role-specific field required validation
    Given a field configured only for Staff and marked Required
    When an Attendee registers (doesn't see this field)
    Then field is not required for them
    And form submits successfully without it

  Scenario: Role assigned to member changes field visibility
    Given I register as Attendee (see limited fields)
    When an admin later changes my role to Staff
    And I try to re-register or update
    Then I now see Staff-only fields
    And am offered to fill them

  Scenario: Default visibility (no role restriction)
    Given a field has no role restrictions (empty selection)
    When any member registers
    Then all members see this field
    And it's shown regardless of role

  Scenario: Mixed visibility in form
    Given registration form has:
      - Public fields (all see)
      - Role A exclusive fields
      - Role B exclusive fields
    When Role A registers
    Then they see: public fields + Role A fields
    And NOT Role B fields

  Scenario: View registered responses by role
    Given members from different roles registered for same event
    When I view registrations in admin
    Then admin sees all responses
    And each registration shows which role member had
    And can filter registrations by role

  Scenario: Export respects role-based fields
    Given CSV export
    When exporting registrations
    Then export includes all fields
    And role-specific fields show empty for members who didn't see them
    And export includes "Member Role" column for reference

  Scenario: Duplicate policy applies across roles
    Given role-based fields configured
    And duplicate policy set to "Allow Update"
    When a member changes roles and re-registers
    Then previous registration can be updated
    And new role-specific fields now appear for update
    And old role-specific fields preserved from previous submission

  Scenario: Super-admin override to see all fields
    Given role-based field configuration
    When global admin views event configuration
    Then they see all fields with role restrictions noted
    And notation: "[Staff only]", "[Volunteer only]"
    And can see complete field setup including hidden-by-role fields

  Scenario: Default role for new members
    Given role-based fields configured
    When a new member registers (no role assigned yet)
    Then either: member sees "Public" fields only, or is prompted to select role first
    And depends on system design
