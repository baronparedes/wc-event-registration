Feature: Submit Long Leave Request
  As a volunteer
  I want to submit a request for an extended absence
  So that the administrative team can manage scheduling appropriately

  Context: Business Rules
    - A long leave must span at least 4 weeks (28 days) from the start date.
    - Start date and end date must both be Sundays.
    - An optional reason must be provided (up to 500 characters).
    - Unauthenticated volunteers must provide an email and last name (or member ID) to look up their profile first.
    - Authenticated volunteers can skip the member lookup step if their profile is linked.
    - The wizard contains 3 steps: 1) Identify, 2) Confirm Profile, 3) Long Leave Details.

  Scenario: Unauthenticated volunteer navigates member lookup and submits request
    Given I am an unauthenticated volunteer
    When I visit the long leave request page
    And I submit my email and last name in the member lookup form (Step 1)
    Then I see a profile match and proceed to confirmation
    When I confirm my profile details (Step 2)
    Then I proceed to the long leave details form (Step 3)
    When I select a valid start date (upcoming Sunday)
    And I select a valid end date (at least 28 days after start date, must be Sunday)
    And I enter a reason for the leave
    And I submit the request
    Then I see a confirmation message
    And the system records my long leave request

  Scenario: Unauthenticated volunteer provides invalid dates
    Given I am an unauthenticated volunteer on the long leave details form (Step 3)
    When I select an end date that is less than 28 days from the start date
    And I submit the request
    Then I see a validation error indicating the leave must span at least 4 weeks

  Scenario: Authenticated volunteer with linked profile submits request
    Given I am an authenticated volunteer with a linked member profile
    When I visit the long leave request page
    Then I automatically skip the member lookup step (Step 1)
    And I proceed directly to profile confirmation (Step 2)
    When I confirm my profile details
    Then I proceed to the long leave details form (Step 3)
    When I fill out valid long leave details and submit
    Then I see a confirmation message
