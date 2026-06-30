Feature: Member Lookup by ID or Name
  As a public user registering for an event
  I want to look up my member profile using either my member ID or my name
  So that I can verify my information and complete registration accurately

  Context: Business Rules
    - Member lookup is the first and mandatory step in registration (core invariant)
    - Lookup can be performed by member ID or by member name (full or partial)
    - Lookup shows only essential information: member name and nickname
    - System prevents direct registration form access without lookup first
    - Lookup checks if member has an existing registration for this event
    - Existing registration status shows if member can register again (depends on event duplicate policy)
    - Member lookup is normalized to avoid revealing whether an ID exists (anti-enumeration)
    - Lookup is rate-limited per IP and per member ID to prevent abuse
    - Member ID can be RFID badge ID, numeric identifier, or other unique identifier
    - Name lookup performs case-insensitive partial matching
    - If name lookup returns multiple matches, no results are displayed for security purposes; user must search again with their full registered name

  Scenario: Existing member successfully looks up profile
    Given I am registering for an open event
    And my member ID exists in the system
    When I enter my member ID and click "Look Up Profile"
    Then my profile appears with my name and nickname displayed
    And I see a message indicating the lookup was successful
    And I can proceed to the registration form

  Scenario: Existing member with previous registration for this event
    Given I have already registered for this event
    And the event allows duplicate registrations (updates)
    When I look up my member ID
    Then I see my profile
    And I see a message: "You have a previous registration for this event. You can update your responses."
    And I can proceed to update my registration

  Scenario: Member not found in system
    Given I enter a member ID that does not exist in the system
    When I click "Look Up Profile"
    Then I see a message: "Member not found"
    And I'm offered an option to create a new member profile
    And I cannot proceed with registration until a profile is found or created

  Scenario: Invalid member ID format
    Given the system expects a specific format for member IDs
    When I enter an ID in incorrect format
    Then I see an error message explaining the correct format
    And I cannot proceed until I enter a valid format

  Scenario: Member with existing registration when duplicates not allowed
    Given I have already registered for this event
    And the event does NOT allow duplicate registrations
    When I look up my member ID
    Then I see my profile
    And I see a message: "You have already registered for this event. You cannot register again."
    And I cannot proceed with registration
    And I'm offered to view my previous registration or close the flow

  Scenario: Lookup is rate-limited
    Given I am looking up member IDs repeatedly within a short time
    When I exceed the rate limit (e.g., 10 lookups per minute from my IP)
    Then I see a message: "Too many lookup attempts. Please try again in a few moments."
    And I must wait before I can look up another member ID

  Scenario: Look up member by name
    Given I am registering for an open event
    And I don't have my member ID available
    When I select the "Look up by name" option
    And I enter my registered full name
    And I click "Search"
    Then my member profile appears with my name and nickname displayed
    And I see a message confirming the lookup was successful
    And I can proceed to the registration form

  Scenario: Name lookup returns multiple matches
    Given I am looking up by name
    And multiple members have similar names in the system
    When I search for a common or partial name
    Then I see a message: "Multiple members found with that name. Please enter your full registered name to narrow results."
    And no results are displayed
    And I must try again with a more specific name (full registered name equivalent)
    And I can enter my complete name to get an exact match

  Scenario: Name lookup returns no matches
    Given I enter a name that does not exist in the system
    When I click "Search"
    Then I see a message: "No members found with that name"
    And I'm offered an option to try a different name
    And I'm also offered an option to create a new member profile
    And I cannot proceed with registration until a profile is found or created

  Scenario: Switch between ID and name lookup
    Given I am on the member lookup page
    And I started with ID lookup but don't have my ID
    When I click "Look up by name instead"
    Then the lookup interface switches to name search
    And my previous ID entry is cleared
    And I can now enter a name to search
