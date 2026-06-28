Feature: Create Event
  As an admin
  I want to create a new event with basic information and registration settings
  So that I can set up events for public registration

  Context: Business Rules
    - New events start in Draft status (not visible to public)
    - Required fields for creation: event title, description, event dates (start and end)
    - Optional fields: location, event slug (auto-generated from title or custom)
    - Registration dates are configured: when registration opens and closes
    - Admin must specify duplicate policy at creation (immutable after creation):
      - Block: Prevent duplicate registrations; show error if member tries to register twice
      - Allow Update: Permit re-registration; member can update previous responses
    - Registration mode can be set: open (accepting registrations) or closed (not accepting)
    - Event creation immediately saves to database; no additional publish step needed for save
    - Slug is auto-generated from title but can be customized; slug must be unique
    - After creation, admin is redirected to event details page for further configuration

  Scenario: Successfully create event with all required information
    Given I am logged in as an admin
    When I navigate to Create Event
    And I enter: title ("Community Cleanup"), description, start date, end date, location
    And I set registration dates: opens in 3 days, closes in 30 days
    And I select duplicate policy (Allow Update)
    And I click "Create Event"
    Then the event is saved in Draft status
    And I'm redirected to the event details page
    And I see a success message: "Event created successfully"

  Scenario: Auto-generated event slug from title
    Given I'm creating an event with title "Annual Holiday Party"
    When I enter the title
    Then the slug field auto-populates with a URL-friendly version: "annual-holiday-party"
    And I can manually change the slug if desired
    And slug must be unique (checked in real-time)

  Scenario: Fail to create without required fields
    Given I'm on the Create Event form
    When I leave required fields empty (title, dates, etc.)
    And I click "Create Event"
    Then I see validation error messages for each empty required field
    And the event is not created
    And I'm prompted to fill in missing fields

  Scenario: Validate event date range
    Given I'm creating an event
    When I set start date after end date (invalid range)
    And I try to save
    Then I see an error: "Event end date must be after start date"
    And creation fails

  Scenario: Validate registration dates
    Given I'm creating an event
    When I set registration closing date before opening date
    And I try to save
    Then I see an error: "Registration closing date must be after opening date"
    And creation fails

  Scenario: Set duplicate policy at creation (immutable)
    Given I'm creating an event
    When I view the duplicate policy options
    Then I see two choices:
      - "Block duplicate registrations" (members cannot register twice)
      - "Allow members to update registrations" (members can re-register to update responses)
    And I must select one before creation
    And after creation, this policy cannot be changed (decision is permanent)

  Scenario: Configure registration dates during creation
    Given I'm creating an event
    When I set: registration opens on June 30, closes on July 15
    And event dates are July 20-21
    Then the system accepts this (registration dates don't have to align exactly with event dates)
    And public users can register from June 30 to July 15
    And event itself occurs July 20-21

  Scenario: Draft event not visible to public
    Given I've created an event in Draft status
    When a public user visits the homepage
    Then they do not see this event in the available events list
    And public cannot access registration for draft event

  Scenario: Custom event slug validation
    Given I'm creating an event
    When I customize the slug to "my-custom-slug"
    And that slug already exists (used by another event)
    And I try to save
    Then I see an error: "This slug is already in use. Please choose a different one."
    And creation fails until I choose a unique slug

  Scenario: See confirmation of all settings after creation
    Given I've successfully created an event
    When I'm on the event details page
    Then I see all entered information displayed:
      - Title, description, location, dates
      - Registration date range
      - Duplicate policy selected
      - Current status: "Draft"
    And I see buttons to Edit, Publish, Delete, or Configure Fields
