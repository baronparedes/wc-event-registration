Feature: Create and Edit Administrative Forms
  As an administrator with write access
  I want to create new dynamic forms or edit existing ones
  So that I can customize data collection for specific needs

  Context: Business Rules
    - Creating a new form and editing an existing form use the same editor page
    - Required fields: Title, Slug, Audience, and Duplicate Policy
    - Forms can be duplicated from existing ones
    - Publishing a form requires passing the publish requirements checker

  Scenario: Create a new form
    Given I am an administrator with "canWriteAdminData" permission
    When I click "New Form" on the Admin Forms page
    Then I am directed to the Form Editor page
    And I can input Title, Slug, Audience, and Duplicate Policy
    And I can save the form as draft

  Scenario: Edit an existing form
    Given I am an administrator with "canWriteAdminData" permission
    When I click "Edit" on a specific form in the Admin Forms page
    Then I am directed to the Form Editor page for that form
    And I can update its Title, Slug, Audience, and Duplicate Policy

  Scenario: Duplicate a form
    Given I am an administrator with "canWriteAdminData" permission
    When I click "Duplicate" on a specific form in the Admin Forms page
    Then a duplication dialog appears
    And I must provide a new Title and Slug
    And upon confirmation, a new form is created with the same fields and settings
    And I am redirected to edit the new form
