Feature: Configure Event Fields
  As an admin
  I want to add, edit, reorder, and delete registration form fields for each event
  So that I can customize the information I collect from members during registration

  Context: Business Rules
    - At least 1 field must exist before event can be published
    - Supported field types: Text, Email, Phone, Checkbox, Select (single choice), Multi-Select (multiple choices), Date, Time, Textarea, Number, URL, File upload
    - Each field has: unique field key (immutable), label (editable), required/optional flag, type, validation rules, and options (for select types)
    - Field key is auto-generated from label but can be customized; must be unique within the event
    - Status-based restrictions:
      - Draft: All field operations allowed (add, edit, reorder, delete)
      - Published: Read-only; no field edits allowed (prevents schema mismatch with existing registrations)
      - Archived: Read-only; cannot modify
    - Changes to field config only affect new registrations; existing registrations preserve original field snapshot
    - Field label and help text changes apply to new registrations only
    - Reordering fields changes the form layout order visible to registrants
    - Deleting a field removes it from new registration forms but preserves answers for past registrations

  Scenario: Add new registration field to draft event
    Given I'm on an event in Draft status
    When I click "Add Field"
    Then a field creation form appears with options:
      - Field label (e.g., "Dietary Preferences")
      - Field type dropdown (Text, Email, Phone, Checkbox, Select, etc.)
      - Required/Optional toggle
      - Validation rule options (if applicable)
    And I select type "Select" with options "Vegetarian", "Vegan", "Pescatarian"
    And I click "Save Field"
    Then field is created and appears in field list
    And field automatically gets a unique key (e.g., "dietary_preferences")

  Scenario: Edit field label in draft event
    Given a field already exists on a draft event
    When I click "Edit" on that field
    Then the field edit form opens showing current settings
    And I can edit: label, help text, required/optional flag
    And I cannot change: field type, field key (immutable)
    And I click "Save"
    Then field label updates immediately

  Scenario: Cannot edit published event fields
    Given an event is in Published status
    When I navigate to the Fields page
    Then all fields appear as read-only
    And "Add Field", "Edit", "Delete" buttons are disabled
    And I see message: "Published events cannot have their fields modified"

  Scenario: Select field with custom options
    Given I'm adding a new Select field
    When I choose field type "Select (single choice)"
    Then an options section appears
    And I can add multiple options with labels and values
    And I can add options: "Option 1", "Option 2", "Option 3"
    And I can reorder options within the field
    And each option label is visible to registrants

  Scenario: Multi-select field with multiple choices
    Given I'm adding a new Multi-Select field
    When I choose field type "Multi-Select"
    Then an options section appears for multiple choices
    And registrants can check multiple boxes or select multiple items
    And I can limit max selections if desired

  Scenario: Reorder fields in registration form
    Given I have multiple fields configured
    When I access the field list
    And I drag or select a field and move it up/down
    And I save the new order
    Then fields appear in this new order on the registration form
    And new registrations see fields in reordered sequence

  Scenario: Delete field from draft event
    Given I have a field on a draft event
    When I click "Delete" on that field
    Then a confirmation dialog appears: "Remove this field? This cannot be undone."
    And I click "Delete" to confirm
    Then field is removed from the form
    And new registrations no longer see this field
    And past registrations that included this field still have the data preserved

  Scenario: Require/Optional field toggle
    Given I'm editing a field
    When I toggle "Required" vs "Optional"
    And I save the field
    Then if Required: registrants must fill this field before submission; validation error if empty
    Then if Optional: registrants can leave blank; no validation error

  Scenario: Set field validation rules
    Given I'm creating an Email field
    When I set up field configuration
    Then validation appears appropriate for type: Email field must be valid email format
    And Phone field has format validation
    And Date field shows date picker
    And Number field restricts to numeric input
    And validation error shows if registrant enters invalid data

  Scenario: Delete populated field and preserve past responses
    Given a field exists and has registrations with responses
    When I delete the field
    And I later view a past registration
    Then the past registration still shows the answer for this deleted field
    And past data is not lost

  Scenario: Field key immutability
    Given a field is created with auto-generated key "event_type"
    When I edit the field
    Then I cannot change the field key
    And key field appears as read-only or disabled
    And system message: "Field key cannot be changed"

  Scenario: Event with no fields cannot be published
    Given a draft event with no fields configured
    When I try to publish the event
    Then publish fails with message: "Event must have at least 1 registration field before publishing"
    And I'm offered button to "Configure Fields" instead

  Scenario: Add field with help text
    Given I'm creating a field
    When I add a label (e.g., "Special Dietary Needs")
    And I add help text (e.g., "Please describe any food allergies or preferences")
    And I save the field
    Then on the registration form, members see both label and help text
    And help text appears below or near the field as guidance
