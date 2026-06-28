Feature: Registration Wizard (Alternative Step-Based UI)
  As a public user who prefers step-by-step workflows
  I want to complete registration through a guided wizard interface
  So that I can focus on each part of registration without feeling overwhelmed

  Context: Business Rules
    - Wizard is an alternative UI mode to the classic single-page registration form
    - Wizard can be toggled on/off via environment configuration
    - Wizard presents registration in distinct steps: Event Info → Member Lookup → Profile Review → Registration Fields → Confirmation
    - Each step shows progress indicator (e.g., "Step 2 of 5")
    - User can navigate backward to previous steps to edit information
    - All business rules from standard registration apply (duplicate policy, required fields, validation, etc.)
    - Wizard uses same underlying data and submission logic as classic flow
    - If wizard is disabled, system falls back to classic single-page form

  Scenario: Navigate through registration wizard steps
    Given the wizard is enabled
    And I'm registering for an open event
    When I enter the registration flow
    Then I see Step 1: Event information (title, dates, description)
    And I see a "Next" button to proceed
    And I see a progress indicator showing "Step 1 of 5"

  Scenario: Complete Member Lookup step
    Given I'm on Step 2 (Member Lookup) in the wizard
    When I enter my member ID
    And I click "Verify ID"
    Then my profile appears with name and nickname
    And I see a "Next" button to proceed to Step 3
    And I can go "Back" to change the member ID

  Scenario: Review member profile in wizard
    Given I've completed member lookup
    When I proceed to Step 3 (Profile Review)
    Then I see my verified member information displayed
    And I see an option to confirm or go back to look up a different member
    And I can click "Next" to proceed to registration fields

  Scenario: Fill registration fields in wizard
    Given I've completed member verification
    When I reach Step 4 (Registration Fields)
    Then I see all event-specific fields to complete
    And I can fill in each field
    And same validation rules apply as classic form

  Scenario: Review and confirm registration in wizard
    Given I've filled all required fields
    When I click "Next" to reach Step 5 (Confirmation)
    Then I see a complete summary of my registration
    And I can review member info, all field responses, and status
    And I have options to either edit a specific step or submit
    And I can click "Submit Registration" to finalize

  Scenario: Navigate back to edit previous step
    Given I'm on Step 4 (Registration Fields) or later
    When I click "Back"
    Then I return to the previous step
    And my previously entered data is preserved
    And I can modify it and click "Next" to continue

  Scenario: Receive confirmation after wizard submission
    Given I've confirmed all information in the wizard
    When I click "Submit Registration"
    Then registration is saved
    And I see a confirmation page showing my registration number and status
    And I can view or close the confirmation

  Scenario: Wizard disabled - fallback to classic form
    Given the wizard is disabled via configuration
    When I start registration
    Then I see the classic single-page form instead of wizard steps
    And all registration features work identically
    And no wizard steps or progress indicators appear
