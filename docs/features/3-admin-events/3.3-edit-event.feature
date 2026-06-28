Feature: Edit Event Details
  As an admin
  I want to update event information after creation (title, dates, location, etc.)
  So that I can correct information or adjust event timing

  Context: Business Rules
    - Only events in Draft or Published status can be edited; Archived events are read-only
    - Editable fields: title, description, location, start date, end date, registration dates
    - Immutable fields (cannot change after creation): slug, duplicate policy
    - Published events show an info banner: "This event is published. Changes will be visible to the public."
    - Changes take effect immediately; no additional publish step needed
    - Existing registrations are unaffected by event detail changes
    - Date validation rules apply: start < end; registration open < close
    - Admin can mark changes as complete and save

  Scenario: Edit event title and description
    Given I'm on an event details page in Draft status
    When I click Edit
    And I change the title from "Community Cleanup" to "Spring Community Cleanup"
    And I update the description
    And I click "Save Changes"
    Then changes are saved immediately
    And I see a success message
    And the event list shows updated title

  Scenario: Edit event dates
    Given I'm editing an event in Draft status
    When I change event start date to a later date
    And I change end date accordingly
    And I click "Save Changes"
    Then the new dates are saved
    And validation is applied (start must be before end)
    And error shown if dates are invalid

  Scenario: Edit registration date range
    Given I'm editing an event
    When I change registration opening date (e.g., open 2 weeks instead of 3 weeks before event)
    And I change registration closing date (e.g., close earlier than planned)
    And I click "Save Changes"
    Then new registration dates are saved
    And future registrations use new date range
    And existing registrations are unaffected

  Scenario: See immutable fields as read-only
    Given I'm editing an event
    When I try to edit the event slug or duplicate policy
    Then those fields are disabled/read-only
    And I see a message: "Cannot change this field after creation"
    And I cannot edit them

  Scenario: See warning banner on published event
    Given I'm editing an event with Published status
    When the event details page loads
    Then I see a banner: "This event is published. Changes will be visible to the public."
    And all changes are still editable (not locked)
    And I can change any editable field

  Scenario: Fail to save with invalid date range
    Given I'm editing event dates
    When I set start date after end date
    And I click "Save Changes"
    Then I see error: "Event end date must be after start date"
    And changes are not saved

  Scenario: Cancel editing and discard changes
    Given I'm editing event details
    When I change the title or other fields
    And I click "Cancel" without saving
    Then changes are discarded
    And event details remain unchanged

  Scenario: Confirm changes before save
    Given I've made changes to event fields
    And the form has unsaved changes
    When I click "Save Changes"
    Then I see a confirmation (if changes are significant)
    And I can confirm or go back to edit more
    And upon confirmation, all changes are saved

  Scenario: Edit event in Draft status without restrictions
    Given an event is in Draft status
    When I edit any field (title, description, dates, location)
    And I click "Save Changes"
    Then all changes are saved without any restrictions or warnings
    And no public visibility concerns (draft is not yet public)

  Scenario: Archived event cannot be edited
    Given an event is in Archived status
    When I navigate to event details
    Then Edit button is disabled or not shown
    And I see a message: "Archived events cannot be edited"
    And all fields appear as read-only
