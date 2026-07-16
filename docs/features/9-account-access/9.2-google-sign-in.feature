Feature: Google Sign-In
  As an invited account holder
  I want to sign in with Google using my approved email
  So that I can enter the platform without needing a password

  Background:
    Given the platform uses invite-only account access
    And admins can still use the existing admin login

  Context: Business Rules
    - The Google email must match an invite before access is granted
    - The first successful sign-in accepts a pending invite
    - The sign-in flow must send the user to the correct account area based on role
    - If the invite is revoked or expired, access is denied
    - If no invite exists for the email, access is denied

  Scenario: Invited member signs in successfully
    Given I have a pending invite tied to my email address
    And my invite role is Member
    When I sign in with Google using the same email address
    Then my invite is accepted
    And I enter the member account area

  Scenario: Invited stakeholder signs in successfully
    Given I have a pending invite tied to my email address
    And my invite role is Stakeholder
    When I sign in with Google using the same email address
    Then my invite is accepted
    And I enter the stakeholder account area

  Scenario: Uninvited Google account is denied
    Given I do not have an invite for my Google email address
    When I sign in with Google
    Then access is denied
    And I see a message telling me to contact an admin

  Scenario: Revoked invite cannot be used
    Given I have an invite that has been revoked
    When I sign in with Google using the invited email address
    Then access is denied
    And I remain outside the platform account area

  Scenario: Expired invite cannot be used
    Given I have an invite that has expired
    When I sign in with Google using the invited email address
    Then access is denied
    And I see a message telling me to contact an admin for a new invite
