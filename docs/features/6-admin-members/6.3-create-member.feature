Feature: Create Member
  As an admin
  I want to manually create a new member profile in the system
  So that I can add members before they register themselves

  Context: Business Rules
    - Creating a member allows admins to pre-populate member database
    - Required fields: Member ID (must be unique), Full Name
    - Optional fields: First Name, Last Name, Nickname, Email, Phone, Date of Birth, Role, Category
    - Member ID must be unique (no duplicates allowed)
    - Member ID is immutable after creation
    - Email validation applied if provided
    - Phone validation applied if provided
    - New member starts with no registrations (registrations created when member registers for events)
    - Member creation does not trigger any event registration
    - Confirmation and success message shown after creation
    - Member appears in member list immediately after creation

  Scenario: Create new member with required information
    Given I'm on the Create Member form or dialog
    When I enter:
      - Member ID: "1324250892"
      - Full Name: "Jane Smith"
    And I click "Create Member"
    Then the member is created successfully
    And I see success message: "Member created successfully"
    And member appears in the members list

  Scenario: Add optional information during creation
    Given I'm creating a new member
    When I enter:
      - Member ID: "1324250893"
      - Full Name: "John Doe"
      - Email: "john.doe@example.com"
      - Phone: "555-1234"
      - Nickname: "Johnny"
      - Role: "Volunteer"
      - Category: "Organizer"
    And I click "Create Member"
    Then member is created with all information
    And all fields are saved

  Scenario: Fail to create without member ID
    Given I'm on the Create Member form
    When I enter Full Name but leave Member ID blank
    And I click "Create Member"
    Then I see error: "Member ID is required"
    And creation fails

  Scenario: Fail to create without full name
    Given I'm on the Create Member form
    When I enter Member ID but leave Full Name blank
    And I click "Create Member"
    Then I see error: "Full Name is required"
    And creation fails

  Scenario: Fail to create with duplicate member ID
    Given a member with ID "1324250891" already exists
    When I try to create another member with same ID
    And I click "Create Member"
    Then I see error: "This Member ID already exists"
    And creation fails
    And I'm prompted to choose a different ID

  Scenario: Validate email format during creation
    Given I'm creating a member
    When I enter an invalid email (e.g., "not-an-email")
    And I click "Create Member"
    Then I see error: "Please enter a valid email address"
    And creation fails

  Scenario: Validate phone format during creation
    Given I'm creating a member
    When I enter an invalid phone (e.g., "abc123")
    And I click "Create Member"
    Then I see error about phone format
    And creation fails

  Scenario: Create member with only required fields (minimal)
    Given I'm on the Create Member form
    When I enter only: Member ID and Full Name
    And I leave all optional fields blank
    And I click "Create Member"
    Then member is created successfully
    And optional fields can be added later through edit

  Scenario: Cancel member creation
    Given I'm on the Create Member form
    When I start filling information
    And I click "Cancel"
    Then the form closes
    And no member is created
    And I return to members list

  Scenario: Created member appears in list immediately
    Given I've just created a new member
    When I navigate to the members list
    Then the new member appears in the list
    And I can see their information

  Scenario: Create member with date of birth
    Given I'm creating a member
    When I select a Date of Birth from date picker
    And I complete member creation
    Then date is saved
    And displays in readable format in member profile

  Scenario: Set role during creation
    Given I'm creating a member
    When I select Role (e.g., "Staff", "Volunteer", "Attendee")
    And I complete creation
    Then role is assigned
    And can be edited later

  Scenario: Set category during creation
    Given I'm creating a member
    When I select Category (e.g., "Organizer", "Participant")
    And I complete creation
    Then category is assigned
    And can be edited later

  Scenario: Multiple admins creating members
    Given two admins are creating members simultaneously
    When they try to create members with same ID
    Then first one succeeds
    And second one gets error about duplicate ID
    And system prevents duplicate creation

  Scenario: See created member in search immediately
    Given I've just created a new member "Sarah Jones"
    When I use the member search box and search for "Sarah"
    Then the new member appears in search results immediately
    And I can click to view her profile
