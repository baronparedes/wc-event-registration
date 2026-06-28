Feature: View All Members
  As an admin
  I want to see a paginated list of all members in the system
  So that I can manage member profiles, search, and find members quickly

  Context: Business Rules
    - Members list shows all members across all events
    - Each member shows: Member ID, Full Name, Email, Role, Category, Created Date
    - Members are paginated with configurable page size (20, 50, or 100 per page)
    - Admin can search members by: ID, full name, first name, last name, or email
    - Search is debounced (waits for typing to stop before searching)
    - Members can be sorted by: created date or member ID
    - Members are displayed with action buttons: View Details, Edit, Update ID, Delete
    - Page size preference is remembered in session
    - Total member count displayed

  Scenario: View all members in system
    Given I'm logged in as an admin
    When I navigate to the Members page
    Then I see a paginated list of all members
    And each member row shows: ID, Full Name, Email, Role, Category, Created Date
    And I see action buttons for each member

  Scenario: See member details in list
    Given members are displayed
    When I look at a member row
    Then I can see: Member ID (identifier), full name, email address
    And Role (if set: Attendee, Volunteer, Staff, etc.)
    And Category (if set: Participant, Organizer, etc.)
    And creation date (when member was added to system)

  Scenario: Search members by ID
    Given I'm on the Members page
    When I enter a member ID in the search box (e.g., "1324250891")
    And I wait for auto-search or press Enter
    Then the list filters to show members matching that ID
    And search is exact or prefix-match (partial IDs find matches)

  Scenario: Search members by name
    Given I'm on the Members page
    When I enter a first or last name in the search box (e.g., "John" or "Smith")
    And I wait for auto-search
    Then the list filters to show members with matching names
    And partial matches work (case-insensitive)
    And both first and last name searches work

  Scenario: Search members by email
    Given I'm on the Members page
    When I enter an email address or partial email in the search box
    And I wait for auto-search
    Then the list filters to members with matching email

  Scenario: Clear search and see all members
    Given I've searched for members
    When I clear the search box or click a clear button
    Then the search is cleared
    And all members are displayed again

  Scenario: Sort members by created date
    Given I'm viewing the members list
    When I click "Created Date" column header
    Then members sort by creation date
    And clicking again reverses order (newest/oldest)
    And sort indicator shows current sort direction

  Scenario: Sort members by ID
    Given I'm viewing the members list
    When I click "Member ID" column header
    Then members sort by ID (alphanumeric)
    And clicking again reverses sort order
    And all members can be sorted by ID

  Scenario: Navigate between pages
    Given members list has multiple pages
    When I click "Next" or a page number
    Then I navigate to that page
    And new members load
    And pagination controls update to show current page

  Scenario: Change page size
    Given I'm viewing the members list
    When I click page size dropdown (showing 20, 50, 100)
    And I select 50 per page
    Then page reloads showing 50 members
    And pagination controls update
    And my preference is remembered

  Scenario: See total member count
    Given I'm on the members list
    Then I see: "Showing X of Y members"
    And total count reflects all members or filtered results (if searching)

  Scenario: View member action buttons
    Given I'm viewing the members list
    When I see each member row
    Then action buttons are available:
      - "View Details" to see full profile
      - "Edit" to modify member info
      - "Update ID" to change member ID
      - Possibly "Delete" to remove member

  Scenario: No members exist yet
    Given no members have been created
    When I navigate to the Members page
    Then I see empty state message
    And message: "No members yet"
    And I see button to "Add Member" or "Create Member"

  Scenario: Filter by role (if available)
    Given members with different roles exist
    When I click a role filter (e.g., show only "Staff")
    Then list shows only members with that role
    And other roles are hidden
    And I can click "All" to see all roles again

  Scenario: Bulk actions on members (if available)
    Given I'm viewing multiple members
    When I select checkboxes on multiple members
    Then I see bulk action options
    And I can perform actions like "Delete Selected" or "Export Selected"
    And I must confirm before applying bulk actions
