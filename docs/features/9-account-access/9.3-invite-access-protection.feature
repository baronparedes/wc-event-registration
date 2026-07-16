Feature: Invite Access Protection
  As the system
  I want to block accounts that are not approved by an admin invite
  So that only invited users can enter the platform

  Context: Business Rules
    - Invite-only access is enforced before a user enters any account area
    - Matching an invite email is required for access
    - Revoked and expired invites are treated as blocked access
    - Admin login remains available through the existing admin path
    - Access checks use the invite as the source of truth

  Scenario: Block access when no invite exists
    Given a Google account does not match any invite
    When the user signs in with Google
    Then access is denied
    And the user cannot enter the platform account area

  Scenario: Block access when an invite has been revoked
    Given an invite exists but its status is revoked
    When the invited user signs in with Google
    Then access is denied
    And the user cannot enter the platform account area

  Scenario: Block access when an invite has expired
    Given an invite exists but its status is expired
    When the invited user signs in with Google
    Then access is denied
    And the user cannot enter the platform account area

  Scenario: Allow access when the invite matches and is pending
    Given a pending invite matches the user's Google email address
    When the user signs in with Google
    Then access is allowed
    And the invite becomes accepted
