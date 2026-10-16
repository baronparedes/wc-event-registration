Feature: Configure Form Fields
  As an administrator with write access
  I want to configure the dynamic fields for a specific form
  So that I can control what data is collected from respondents

  Context: Business Rules
    - Fields can be of different types (Text, Number, Date, Select, Checkbox, etc.)
    - Fields can be required or optional
    - Fields can have specific validation rules depending on their type
    - Fields can have custom display text and helper text
    - Fields can be reordered within the form

  Scenario: Access form fields configuration
    Given I am an administrator with "canWriteAdminData" permission
    When I click "Form Fields" for a specific form on the Admin Forms page
    Then I am directed to the Form Fields configuration page for that form
    And I see a list of currently configured fields

  Scenario: Add a new field
    Given I am on the Form Fields configuration page
    When I choose to add a new field
    Then I can specify the field Type, Name, Display Text, and Validation rules
    And I can mark it as Required or Optional

  Scenario: Edit an existing field
    Given I am on the Form Fields configuration page
    When I select an existing field to edit
    Then I can update its Type, Name, Display Text, and Validation rules

  Scenario: Reorder fields
    Given I am on the Form Fields configuration page
    When I drag and drop fields in the list
    Then the new order is saved and will be reflected when the form is rendered
