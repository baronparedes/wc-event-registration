Feature: Volunteer Recruitment Settings
  As an administrator
  I want to configure the global rules and data points for the recruitment pipeline
  So that I can control intake status, pre-qualification criteria, doctrinal surveys, and DGroup leader attestations

  Context: Business Rules
    - Recruitment settings affect the global behavior of the application's intake portal (Step 1).
    - The settings interface is organized into three tabs: "General & Status", "Doctrinal Survey Questions", and "DGroup Endorsement Prompts".
    - Administrators can open or close the recruitment intake globally, which updates the banner on the WelcomeHub home page and kiosk applications.
    - Pre-qualification gates enforce minimum/maximum age, minimum DGroup months, and GLC course completion during Step 1.
    - External VMT registration URL and Step 3 Orientation instructions can be customized.
    - The Doctrinal Survey Bank consists of True/False statements presented to candidates in Step 1, which provide a theological discussion guide for Step 2 Interviewers.
    - The DGroup Leader Attestation consists of dynamic fields rendered in the magic-link review flow sent to the applicant's DGroup Leader.
    - Fields in the survey and endorsement tabs can be marked as active/inactive or required/optional.
    - The "Save Settings" button remains disabled until changes are made to the configuration.

  Scenario: Update Intake Status and General Workflows
    Given I am authenticated as an administrator
    And I navigate to the Volunteer Recruitment Settings page
    When I am on the "General & Status" tab
    And I toggle the "Intake Status" switch to "Closed"
    And I update the "Step 3 Orientation Instructions" with new guidelines
    And I adjust the "Minimum Age" pre-qualification gate to 21
    Then the "Save Settings" button becomes enabled
    When I click "Save Settings"
    Then the recruitment settings are successfully updated
    And a success toast confirms the update

  Scenario: Configure Doctrinal Survey Questions
    Given I am authenticated as an administrator on the Volunteer Recruitment Settings page
    When I switch to the "Doctrinal Survey Questions" tab
    Then I see a list of True/False statements for the 20-Question Doctrinal Survey Bank
    When I update the statement text for a specific question
    And I toggle its "Active Question" status to inactive
    And I update the expected answer to "False"
    And I provide a new Biblical Guide / Scripture Reference
    And I click "Save Settings"
    Then the specific doctrinal survey question is updated and saved in the database

  Scenario: Configure DGroup Endorsement Prompts
    Given I am authenticated as an administrator on the Volunteer Recruitment Settings page
    When I switch to the "DGroup Endorsement Prompts" tab
    Then I see a list of dynamic fields for the DGroup Leader Attestation
    When I change the "Question Prompt / Field Label" of an existing prompt
    And I check the "Required" and "Active" checkboxes for that prompt
    And I update the "Help Text" to provide clearer instructions
    And I click "Save Settings"
    Then the endorsement prompt configuration is successfully saved
