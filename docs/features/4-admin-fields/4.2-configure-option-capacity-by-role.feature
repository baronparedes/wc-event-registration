Feature: Configure Option Capacity by Role
  As an admin
  I want to configure role allotments per option
  So that each option can reserve capacity for specific member roles

  Context: Business Rules
    - Role allotments are configured per option as role + allotted slots pairs
    - Role matching is case-insensitive
    - Option capacity is derived from the total allotted slots for that option
    - Members with roles not listed in an option's role allotments do not consume slots for that option
    - If an option has no role allotments, it remains open unless other option capacity rules are defined
    - Role allotment changes apply to new submissions and capacity checks after save

  Scenario: Admin adds role allotments to an option
    Given I am editing fields for a draft event
    And I am configuring an option-based registration field
    When I add role allotments for an option
    And I save the field
    Then the option stores the configured role allotments
    And the option shows a derived total capacity based on those allotments

  Scenario: Derived option total updates when allotments change
    Given an option has existing role allotments
    When I increase one role's allotted slots
    And I save
    Then the option's derived total capacity increases accordingly

  Scenario: Role matching is case-insensitive during capacity checks
    Given an option has an allotment for role "Prayer Coach"
    When a member with role "prayer coach" submits registration for that option
    Then the submission is evaluated against the same allotment

  Scenario: Unlisted role does not consume role-allotted capacity
    Given an option has role allotments for "Prayer Coach" and "Backroom"
    When a member with role "OIC" submits registration for that option
    Then that submission does not consume the role-allotted slots for the option

  Scenario: Option without role allotments remains open
    Given an option has no configured role allotments
    When registrations are submitted for that option
    Then capacity is treated as open unless another option capacity rule applies
