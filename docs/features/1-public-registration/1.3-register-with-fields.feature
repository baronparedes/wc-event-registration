Feature: Register for Event with Dynamic Fields
  As a public user
  I want to fill in event-specific registration fields after my member lookup
  So that I can provide the information the event organizer needs

  Context: Business Rules
    - Registration form fields are customized per event by admins
    - Field types supported: text, email, phone, checkbox, select (single), multi-select, date, time, textarea, and more
    - Required fields must be filled; optional fields can be left blank
    - Field validation happens immediately on submission (not just client-side)
    - Duplicate policy determines if existing registrations can be updated:
      - Block: New submission rejected if registration exists; user sees error
      - Allow Update: New submission overwrites previous responses; shows "Updated" status
      - Allow Multiple Registrations: New submission creates another independent registration; status remains "Submitted"
    - Each submission is tracked: new registrations show "Submitted", updates show "Updated"
    - Submission includes generated idempotency key to prevent accidental duplicate submissions
    - User cannot register until all required fields are completed

  Scenario: Complete registration with all required fields
    Given I have completed member lookup successfully
    And I'm viewing a registration form for an open event
    When I fill in all required registration fields with valid data
    And I click "Submit Registration"
    Then my registration is saved
    And I see a confirmation message with my registration confirmation number
    And my registration status shows "Submitted"

  Scenario: See all event-specific field types
    Given I'm viewing a registration form
    When the form loads
    Then I see all field types configured for this event: text fields, email fields, phone fields, checkboxes, dropdowns, date pickers, etc.
    And each field displays with its label and any required indicator
    And I can interact with all field types

  Scenario: Fail to submit with missing required field
    Given I'm on the registration form
    When I leave a required field blank
    And I click "Submit Registration"
    Then I see an error message highlighting the required field
    And registration does not submit
    And I'm prompted to fill in the missing field

  Scenario: Fail to submit with invalid field value
    Given I'm on the registration form
    When I enter invalid data in a field (e.g., invalid email format, invalid phone format)
    And I click "Submit Registration"
    Then I see an error message indicating what's invalid about the field
    And the field is highlighted
    And registration does not submit

  Scenario: Update existing registration when duplicate policy allows
    Given I previously registered for this event
    And the event's duplicate policy allows updates
    When I look up my member ID again
    And I modify some field responses
    And I click "Submit Registration"
    Then my registration is updated with new responses
    And I see a message: "Registration updated successfully"
    And my registration status now shows "Updated"
    And the previous responses are replaced

  Scenario: Fail to register when duplicate policy blocks updates
    Given I previously registered for this event
    And the event's duplicate policy is set to block duplicates
    When I look up my member ID again
    And I try to modify and submit
    Then I see an error message: "You have already registered for this event. Registration updates are not allowed."
    And my registration is not changed
    And I cannot proceed with a new submission

  Scenario: Submit another registration when duplicate policy allows multiple
    Given I previously registered for this event
    And the event's duplicate policy is set to allow multiple registrations
    When I look up my member ID again
    And I submit a new set of field responses
    Then a new registration record is created
    And I see a success message for submission
    And my new registration status shows "Submitted"
    And my prior registration record remains unchanged

  Scenario: Submit with optional fields left blank
    Given I'm on the registration form
    And some fields are marked as optional
    When I fill only required fields and leave optional fields blank
    And I click "Submit Registration"
    Then my registration is saved successfully
    And optional fields record empty/null values

  Scenario: See preview of registration before final submit
    Given I have filled in all required registration fields
    And I'm ready to submit
    When I click a "Review" or "Preview" button (if available)
    Then I see a summary of my submitted data
    And I can confirm it looks correct
    And I can go back and edit fields if needed
    And then complete final submission
