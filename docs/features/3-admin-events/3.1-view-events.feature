Feature: View All Events
  As an admin
  I want to see a paginated list of all events with their status and key details
  So that I can manage, publish, and monitor event registrations

  Context: Business Rules
    - Event list shows all events regardless of status (draft, published, archived)
    - Each event displays: title, status badge, duplicate policy, registration dates, and action buttons
    - Events are paginated with configurable page size (20, 50, or 100 per page)
    - Events use cursor-based pagination for efficient navigation
    - Admin can search events by title or keyword
    - Admin can sort/filter by event status (Draft, Published, Archived)
    - Quick-action buttons available: Edit, Publish, Archive, View Fields, View Registrations
    - Buttons are contextual: only enabled actions show (e.g., Publish only for draft events)
    - Page size preference is remembered in session

  Scenario: View all events with status indicators
    Given I am logged in as an admin
    When I navigate to the Events page
    Then I see a paginated list of all events
    And each event shows: title, status badge (Draft/Published/Archived), duplicate policy, registration dates
    And I see quick-action buttons for each event

  Scenario: See published event with full action set
    Given I'm viewing the events list
    And an event is in Published status
    When I look at that event row
    Then I see action buttons: Edit, Archive, View Fields, View Registrations
    And Publish button is not available (already published)
    And I can click any available button to take that action

  Scenario: See draft event with limited actions
    Given I'm viewing the events list
    And an event is in Draft status
    When I look at that event row
    Then I see action buttons: Edit, Publish, View Fields
    And Archive and View Registrations are not available (no registrations yet)
    And all available actions are enabled

  Scenario: See archived event as read-only
    Given I'm viewing the events list
    And an event is in Archived status
    When I look at that event row
    Then I see only: View Details, View Fields, View Registrations buttons
    And Edit, Publish, Archive buttons are disabled/hidden
    And I cannot modify archived events

  Scenario: Search for event by title
    Given I'm on the Events page
    When I enter a search term in the search box (e.g., "Community Meeting")
    And I press Enter or wait for auto-search
    Then the list filters to show only events matching that search term
    And results update within 500ms (debounced)
    And I can clear the search to see all events again

  Scenario: Sort/filter events by status
    Given I'm on the Events page
    When I click a status filter (Draft, Published, Archived)
    Then the list shows only events with that status
    And other statuses are hidden
    And I can click "All" or another status to change filter

  Scenario: Navigate between pages of events
    Given events list has more than one page
    When I view page 1
    And I click "Next Page" or page number
    Then I navigate to the next page
    And events on that page load
    And I see updated pagination controls showing current page

  Scenario: Change page size
    Given I'm viewing the events list
    When I click the page size dropdown (20, 50, 100)
    And I select a different size (e.g., 50 per page)
    Then the page reloads showing 50 events per page
    And pagination controls update
    And my selection is remembered for future visits

  Scenario: See pagination controls at bottom of list
    Given I'm viewing the events list
    When the page loads
    Then I see pagination controls at the bottom
    And controls show: "First", "Previous", "Next", "Last" buttons
    And current page indicator (e.g., "Page 1 of 5")
    And disabled buttons are grayed out (e.g., First/Previous on page 1)

  Scenario: No events exist
    Given no events have been created yet
    When I navigate to the Events page
    Then I see an empty state message
    And message says "No events yet" or similar
    And I see a "Create Event" button to get started
