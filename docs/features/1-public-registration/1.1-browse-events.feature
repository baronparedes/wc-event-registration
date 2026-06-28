Feature: Browse Available Events
  As a public user
  I want to see a list of events available for registration
  So that I can choose which event to join and find registration dates

  Context: Business Rules
    - Events are organized into three categories: Open (registration now), Upcoming (registration not yet open), Past (registration closed)
    - Each event shows: title, description, location, registration dates, and status badge
    - Only published events appear to public users; draft and archived events are hidden
    - Events are ordered by registration opening date
    - Public users cannot see admin-only details (duplicate policy, member count, etc.)

  Scenario: View all event categories on homepage
    Given I am an unauthenticated public user
    When I visit the homepage
    Then I see a list of events organized into three sections: "Open", "Upcoming", and "Past"
    And each section shows only events in that registration status

  Scenario: See complete event information
    Given events are displayed on the homepage
    When I look at an event card
    Then I see: event title, brief description, location, and registration dates
    And I see a clear status badge indicating if registration is "Open", "Not Yet Open", or "Closed"
    And I can click the event to view details or register

  Scenario: Open event available for immediate registration
    Given an event with registration currently open
    When I view the event
    Then I see the registration is open
    And I see a "Register Now" button
    And I can click it to begin registration

  Scenario: Event registration not yet open
    Given an event with registration that hasn't started yet
    When I view the event
    Then I see "Registration opens on [date]" message
    And I cannot click a registration button
    And I can view the event details

  Scenario: Event registration has closed
    Given an event with registration that has passed
    When I view the event
    Then I see "Registration closed on [date]" message
    And I cannot register
    And I can view the event details for reference

  Scenario: No events available
    Given no events are currently published
    When I visit the homepage
    Then I see an empty state message
    And the message explains when events will be available or how to check back later
