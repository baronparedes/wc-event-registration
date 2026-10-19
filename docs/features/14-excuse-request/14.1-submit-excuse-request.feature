Feature: Submit Excuse Request
  As a volunteer
  I want to submit an excuse request when I cannot attend a Sunday service
  So that I can inform coordinators and team leaders in advance

  Context: Business Rules
    - Volunteers must provide a reason for their absence.
    - An excuse request applies to a specific upcoming Sunday date.
    - The Sunday date cannot be more than 3 days in the past or 6 months in the future.
    - The volunteer must specify one or more service slots they will miss.
    - If the user is signed in, their member profile is auto-detected.
    - If the user is not signed in, they must identify themselves via Member Lookup.
    - The process operates as a three-step wizard: Identify (Step 1) -> Confirm (Step 2) -> Excuse Details (Step 3).
    - After submission, a confirmation screen displays the details.

  Scenario: Signed-in volunteer submits an excuse request
    Given I am a signed-in volunteer
    When I visit the excuse request page
    Then I am automatically verified
    And I proceed directly to Step 2 to confirm my profile details
    When I confirm my profile
    And I proceed to Step 3
    And I select an upcoming Sunday date
    And I select one or more service slots
    And I provide a reason for my absence
    And I submit the request
    Then I see a confirmation page displaying my name, the selected date, the excused service slots, and my reason.
    And the excuse request is saved.

  Scenario: Unauthenticated volunteer submits an excuse request
    Given I am not signed in
    When I visit the excuse request page
    Then I see Step 1 to identify myself
    When I provide my Member ID and submit
    Then I proceed to Step 2 to confirm my profile details
    When I confirm my profile
    And I proceed to Step 3
    And I select an upcoming Sunday date
    And I select one or more service slots
    And I provide a reason for my absence
    And I submit the request
    Then I see a confirmation page displaying my name, the selected date, the excused service slots, and my reason.
    And the excuse request is saved.

  Scenario: Attempt to submit without a reason
    Given I am on Step 3 of the excuse request wizard
    When I leave the reason field empty
    And I submit the form
    Then I see a validation error stating "Please provide a reason for your absence"
    And the form is not submitted

  Scenario: Attempt to submit without selecting service slots
    Given I am on Step 3 of the excuse request wizard
    When I do not select any service slots
    And I submit the form
    Then I see a validation error stating "Please select at least one service slot"
    And the form is not submitted

  Scenario: Navigate back to edit previous steps
    Given I am not signed in
    And I have completed Step 1 (Identify)
    When I am on Step 2 (Confirm Profile)
    And I click "Scan Another Member"
    Then I am returned to Step 1
    And I can enter a different Member ID
