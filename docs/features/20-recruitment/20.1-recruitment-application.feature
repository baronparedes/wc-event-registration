Feature: Welcome Center Recruitment Application Process
  As a prospective volunteer
  I want to apply to join the Welcome Center team
  So that I can serve and track my onboarding progress

  Context: Business Rules
    - Recruitment cycles can be opened and closed by administrators
    - Applicants must acknowledge role responsibilities, GLC Level 1 completion, Data Privacy Waiver, and DGroup attendance requirements before applying
    - Only users without an active or on-hold application can submit a new application when recruitment is open
    - The recruitment journey consists of 9 sequential steps: Registration, Interview, Orientation, Observation, Evaluation, Onboarding (Prayer Coach only), VMT Registration, RFID Releasing, and Deployment
    - Administrative staff can bypass the active application restriction to view recruitment settings

  Scenario: View open recruitment banner on homepage
    Given I am authenticated and have no active application
    And the Welcome Center recruitment cycle is currently open
    When I view the homepage
    Then I see a banner inviting me to join the Welcome Center team
    And clicking "Join Now" takes me to the application page

  Scenario: View application progress banner on homepage
    Given I am authenticated and have an active application
    When I view the homepage
    Then I see a banner showing my current application step out of 9
    And I see a progress bar reflecting my completion percentage
    And clicking "View Status" takes me to my recruitment progress page

  Scenario: Acknowledge pre-gate requirements before applying
    Given I am on the recruitment application page
    When I review the roles and responsibilities and acknowledge GLC Level 1 completion
    And I agree to the Data Privacy and Liability Waiver
    And I confirm my DGroup attendance for more than 6 months
    And I select my demographic age range
    And I click "Continue to application"
    Then I proceed to the main application form

  Scenario: Track application progress and next steps
    Given I have successfully submitted an application
    When I visit my recruitment progress page
    Then I see a timeline of the 9 recruitment steps
    And I see which steps are completed, pending, or locked
    And steps not applicable to my applied role (e.g., Prayer Coach Onboarding for non-Prayer Coaches) are marked as skipped
