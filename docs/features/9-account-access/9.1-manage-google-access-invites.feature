Feature: Manage Google Access Invites
  As an admin
  I want to create and manage invites for account access
  So that only approved people can sign in with Google

  Context: Business Rules
    - Access is invite-only for this release
    - Each invite is tied to one email address and one person record
    - Invite roles are limited to Member and Stakeholder
    - Invite status can be: pending, accepted, revoked, or expired
    - A pending invite becomes accepted after the first successful sign-in
    - Admins can create, resend, and revoke invites
    - Admin login continues to work alongside Google sign-in

  Scenario: Admin creates an invite for a member
    Given I am an admin
    When I create a new invite for a person record using their email address
    Then the invite is saved as pending
    And the invite is assigned the Member role
    And the invited person can use Google sign-in later

  Scenario: Admin creates an invite for a stakeholder
    Given I am an admin
    When I create a new invite for a stakeholder using their email address
    Then the invite is saved as pending
    And the invite is assigned the Stakeholder role
    And the invited person can use Google sign-in later

  Scenario: Admin cannot create a duplicate pending invite for the same email
    Given I am an admin
    And a pending invite already exists for the same email address
    When I try to create another invite for that email
    Then I see a message that an invite already exists
    And no duplicate invite is created

  Scenario: Admin revokes an invite
    Given I am viewing a pending invite
    When I revoke the invite
    Then the invite status changes to revoked
    And the invite can no longer be used to sign in

  Scenario: Admin resends a pending invite
    Given I am viewing a pending invite
    When I resend the invite
    Then the invited person receives a new access message
    And the invite remains pending
