Feature: Public Registration Capacity Rules
  As a public attendee
  I want registration capacity checks to stay fair and predictable
  So that I receive clear outcomes when options are full

  Context: Business Rules
    - Public attendees do not provide a member role during self-registration
    - Public capacity checks enforce option caps that do not depend on role matching
    - Options configured only with role allotments are treated as role-neutral in public flow
    - Cancelled registrations do not consume active option capacity

  Scenario: Public attendee is blocked when a non-role option is full
    Given an option has a non-role capacity limit
    And active registrations have filled that option
    When I select that option in public self-registration
    And I submit
    Then my submission is blocked
    And I see a message that the selected option is already full

  Scenario: Public attendee can submit when non-role option still has capacity
    Given an option has a non-role capacity limit
    And active registrations have not filled that option
    When I select that option and submit
    Then my public registration succeeds

  Scenario: Role-allotted option remains role-neutral in public flow
    Given an option is configured with role allotments
    When I select that option in public self-registration
    Then role-based slot matching is not required for my submission

  Scenario: Cancelled public registration does not block available slots
    Given a prior public registration selecting an option was cancelled
    When I submit a new public registration for that same option
    Then the cancelled registration is not counted as active usage
