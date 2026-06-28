Feature: Publish Event
  As an admin
  I want to publish a draft event to make it visible for public registration
  So that members can register for the event

  Context: Business Rules
    - Only draft events can be published; published/archived events cannot be re-published
    - Publishing enforces strict requirements to prevent incomplete events:
      - Event must have at least 1 registration field configured
      - Event must have title and description
      - Event must have valid event dates (start date in future or today)
      - Registration closing date must be before event start date
      - At least one of the above checks must pass for publication to succeed
    - Published events become visible on public homepage
    - Public registration opens according to event's registration_opens_at date
    - Published events show a "Published" badge on events list
    - Admin can see a requirements checklist before publishing to confirm readiness
    - Publishing is one-way: once published, event can only be archived (not reverted to draft)

  Scenario: Successfully publish draft event with all requirements met
    Given I'm viewing a draft event with all requirements complete:
      - Title and description filled
      - At least 1 registration field configured
      - Event dates set to future dates
      - Registration closing date before event start
    When I click "Publish Event"
    Then a confirmation dialog appears showing the requirements checklist
    And all items show green checkmarks (requirements satisfied)
    And I can click "Confirm Publish"
    And the event status changes to Published
    And I see success message: "Event published successfully"

  Scenario: See requirements checklist before publishing
    Given I'm on a draft event details page
    When I click "Publish Event"
    Then a requirements dialog appears showing:
      - ✓ Event title and description
      - ✓ At least 1 registration field
      - ✓ Valid event dates (start in future)
      - ✓ Registration closes before event starts
    And green checkmarks show satisfied requirements
    And red X marks show unsatisfied requirements
    And a disabled Publish button if requirements are not met

  Scenario: Fail to publish without required registration field
    Given I'm on a draft event with no registration fields
    When I click "Publish Event"
    Then the requirements dialog shows:
      - ✗ At least 1 registration field (requirement not met)
    And the Publish button is disabled
    And I see message: "Please add at least 1 registration field before publishing"
    And I'm guided to Configure Fields page

  Scenario: Fail to publish with past event dates
    Given I'm on a draft event
    When event start date is in the past
    And I click "Publish Event"
    Then requirements dialog shows:
      - ✗ Event dates must be in future (requirement not met)
    And Publish button is disabled
    And message: "Event start date must be in the future"

  Scenario: Fail to publish with registration dates after event
    Given I'm on a draft event
    When registration closing date is after event end date
    And I click "Publish Event"
    Then requirements dialog shows:
      - ✗ Registration must close before event starts (requirement not met)
    And Publish button is disabled
    And message explaining the date constraint

  Scenario: Cancel publish and return to event
    Given I see the requirements/confirmation dialog
    When I click "Cancel" on the dialog
    Then the dialog closes
    And I return to the event details page
    And event remains in Draft status (not published)

  Scenario: Published event now visible to public
    Given I've successfully published an event
    When a public user visits the homepage
    Then they see this event in the appropriate category (Open, Upcoming, or Past based on registration dates)
    And they can click to register

  Scenario: See success confirmation after publish
    Given I've clicked Confirm Publish
    When the publish completes successfully
    Then I see: "Event published successfully"
    And event status badge changes to "Published"
    And I can now click buttons like Archive, View Registrations

  Scenario: Published event shows publication timestamp
    Given I've just published an event
    When I view event details
    Then I see a field showing when it was published: "Published on [date/time]"
    And this timestamp is read-only
