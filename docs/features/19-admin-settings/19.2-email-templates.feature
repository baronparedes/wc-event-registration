Feature: Admin Email Templates Management
  As a system administrator
  I want to manage mappings between internal event slugs and external Resend templates
  So that I can control what emails are sent without changing application code

  Context: Business Rules
    - System event slugs must be unique and use lowercase alphanumeric characters with underscores/hyphens.
    - An email template must have a name, a unique system slug, and a Resend template ID.
    - Templates can optionally define a comma-separated list of required dynamic variables.
    - When editing a template, the system slug is locked to preserve existing system triggers.
    - The interface provides a search feature to filter templates by name, slug, Resend ID, or variable.

  Scenario: Viewing the list of email templates
    Given I am authenticated as an administrator
    And there are existing email templates configured
    When I navigate to the "Email Templates" settings page
    Then I see a list of templates showing Name, System Slug, Resend Template ID, and Required Variables
    And I can search the templates to filter the list

  Scenario: Creating a new email template mapping
    Given I am authenticated as an administrator
    And I am on the "Email Templates" settings page
    When I click the "New Template Mapping" button
    And I enter a template name, Resend template ID, and required variables
    Then a system slug is automatically generated from the template name
    When I submit the form
    Then a new template mapping is saved and appears in the list

  Scenario: Editing an existing template mapping
    Given I am authenticated as an administrator
    And I am on the "Email Templates" settings page
    When I click the "Edit" action on an existing template
    Then the edit dialog opens with the template details populated
    And the "System Slug" field is locked and read-only
    When I update the Resend template ID or required variables
    And I submit the form
    Then the template mapping is updated and saved
