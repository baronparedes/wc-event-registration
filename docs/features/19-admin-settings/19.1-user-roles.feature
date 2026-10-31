Feature: Admin User Roles Management
  As a super administrator
  I want to assign, view, edit, and revoke system roles for users
  So that I can control access to different areas and capabilities of the application

  Context: Business Rules
    - Only users with the `super_admin` role can manage other users' roles
    - Available roles include `super_admin`, `admin`, `slod`, `imt`, and `kiosk`
    - A user can only have one primary administrative role assigned via this interface
    - Super Admin roles cannot be edited or revoked through the standard interface to prevent accidental lockout
    - Verified member profiles are indicated with a shield check icon

  Scenario: View all assigned user roles
    Given I am authenticated as a "super_admin" user
    When I visit the "User Roles" settings page
    Then I see a list of users with assigned roles
    And I see each user's name, email, auth ID, assigned role badge, and assignment date
    And I see a shield check icon next to users who have a verified member profile

  Scenario: Assign a new role to a user
    Given I am authenticated as a "super_admin" user
    And I am on the "User Roles" settings page
    When I click the "Assign Role to User" button
    Then an "Assign Role" dialog opens
    When I select an available user from the list
    And I select an administrative role to assign
    And I click "Assign Role"
    Then the dialog closes
    And the user is added to the roles list with their new badge
    And a success message confirms the assignment

  Scenario: Edit an existing user's role
    Given I am authenticated as a "super_admin" user
    And I am viewing the assigned user roles list
    When I click the "Edit" action for a standard admin user
    Then an "Edit Role" dialog opens showing their current assignment
    When I select a different role from the dropdown
    And I click "Save Changes"
    Then the dialog closes
    And the user's role badge updates in the list
    And a success message confirms the update

  Scenario: Revoke a user's role
    Given I am authenticated as a "super_admin" user
    And I am viewing the assigned user roles list
    When I click the "Revoke" action for a standard admin user
    Then a confirmation dialog appears warning that the user will revert to standard member permissions
    When I click "Revoke Role"
    Then the confirmation dialog closes
    And the user is removed from the assigned roles list
    And a success message confirms the revocation

  Scenario: Super Admin protection
    Given I am authenticated as a "super_admin" user
    And I am viewing the assigned user roles list
    When I locate a user with the `super_admin` role
    Then I do not see the "Edit" or "Revoke" action buttons
    And I see a "Protected" lock icon instead
