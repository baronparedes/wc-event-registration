Feature: AI Generator for Entities
  As an administrator
  I want to use AI to generate events and forms with predefined fields and metadata
  So that I can quickly set up new entities without manually configuring every detail

  Context: Business Rules
    - The AI generator can create Blueprints for both Events and Forms
    - A Blueprint consists of Metadata (title, description, dates, etc.) and Dynamic Fields (questions)
    - Administrators can provide a prompt to guide the AI generation
    - The generated fields can be individually selected or deselected before applying
    - The generated Blueprint can be applied directly to a form, used to create a new entity, or appended to an existing entity's fields
    - The generator is accessible from the "Draft with Hub AI" button when creating new events or forms
    - The generator is also accessible when configuring fields for an existing event or form

  Scenario: Generate an Event Blueprint
    Given I am an administrator on the Create Event page
    When I click "Draft with Hub AI"
    Then the AI Generator modal opens for the "event" domain
    And I can enter a prompt and optionally select an audience preference
    When I submit the prompt
    Then the AI generates an Event Blueprint with title, description, and suggested fields
    And I can review and select/deselect specific fields

  Scenario: Apply Blueprint to Form (Create Mode)
    Given I have generated a Blueprint in the AI Generator modal (Create Mode)
    When I choose to apply the generated details
    Then the AI modal closes
    And the Create Event/Form fields are populated with the Blueprint's metadata
    And the selected fields are saved to be created with the entity

  Scenario: Create Entity directly from Blueprint
    Given I have generated a Blueprint in the AI Generator modal (Create Mode)
    When I click the primary action to create the entity (e.g., "Create Event & Fields")
    Then the entity is created in the database with the generated metadata
    And the selected fields are attached to the new entity
    And I am redirected to the Fields configuration page for the new entity

  Scenario: Append Blueprint Fields to an existing entity
    Given I am an administrator on the Fields configuration page for an existing Event or Form
    When I open the AI Generator modal (Append Mode)
    And I generate a Blueprint with a prompt
    Then I see a list of suggested fields
    When I select specific fields and confirm
    Then the selected fields are appended to the existing entity
    And the modal closes, updating the fields list
