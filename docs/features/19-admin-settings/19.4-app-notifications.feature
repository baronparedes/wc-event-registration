Feature: App Notifications
  As an administrator
  I want to compose and broadcast announcements or reminders
  So that I can keep users informed about important updates and Sunday schedules

  Context: Business Rules
    - Notifications can be sent via Push and/or Email channels
    - Broadcasts can target all members, a specific event audience, specific roles, or a single user
    - Drafts can be generated using AI
    - Delivery logs and analytics are tracked in a dedicated dashboard
    - Sunday service reminders have a specialized dispatch flow linked to volunteer schedules

  Scenario: Compose and send a notification broadcast
    Given I am authenticated as an administrator
    And I am on the App Notifications page
    When I fill in the Title and Message fields
    And I select 'All Registered Members' as the Target Audience
    And I choose Push and Email channels
    And I click 'Send Broadcast'
    Then a confirmation dialog appears
    When I confirm the broadcast
    Then a success message appears
    And the form resets

  Scenario: Generate notification draft with AI
    Given I am on the App Notifications page
    When I click 'Draft with AI'
    Then the AI draft modal appears
    When I specify the context and click Generate
    Then the generated content populates the draft preview
    When I click 'Apply Draft'
    Then the Title and Message fields are populated with the AI content

  Scenario: View Broadcast Dashboard metrics
    Given I am authenticated as an administrator
    When I visit the Notifications Dashboard
    Then I see the Push Notification Subscribers metric percentage
    And I see a list of Campaign Performances with read rates

  Scenario: Manage Sunday Reminders dispatch
    Given I am authenticated as an administrator
    When I visit the Sunday Reminders page
    Then I see a schedule dispatch controls section
    And I can select a specific Sunday date
    And I see a breakdown of the Delivery Status for push and email
    And I see a Scheduled Volunteer Roster table
    When I click 'Dispatch Reminders'
    Then a confirmation modal appears summarizing the expected delivery
