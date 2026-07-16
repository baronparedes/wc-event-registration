Feature: Role-Based Account Area
  As an invited account holder
  I want to land in the correct account area for my role
  So that I only see the information intended for me

  Context: Business Rules
    - Members and Stakeholders share one account experience with role-based visibility
    - The user role determines the landing area after sign-in
    - A Member sees member-specific information and sections
    - A Stakeholder sees stakeholder-specific information and sections
    - Sections that do not apply to the role are hidden
    - The current admin login flow remains unchanged

  Scenario: Member sees member-specific account area
    Given I am an invited account holder with the Member role
    When I sign in successfully
    Then I land in the member account area
    And I see only member-specific sections

  Scenario: Stakeholder sees stakeholder-specific account area
    Given I am an invited account holder with the Stakeholder role
    When I sign in successfully
    Then I land in the stakeholder account area
    And I see only stakeholder-specific sections

  Scenario: Role-specific sections remain hidden
    Given I am signed in as a Member
    When I view my account area
    Then stakeholder-only sections are hidden
    And I do not see information that is not meant for members

  Scenario: Admin login still routes to the admin area
    Given I am an admin user using the existing admin login
    When I sign in with my admin credentials
    Then I land in the admin area
    And the member and stakeholder account areas do not replace admin access
