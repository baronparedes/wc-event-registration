Feature: App Notifications and Broadcasting
  As an administrator
  I want to compose and broadcast in-app alerts and push notifications to all users, specific roles, or specific users
  So that I can deliver real-time announcements, service reminders, and operational updates

  Context: Business Rules
    - Admin notifications page (/admin/notifications) is strictly restricted to authorized administrators
    - Supports three targeting modes:
      1. All Users: Mass broadcast sent to every registered application user
      2. Specific Roles: Multi-role broadcast targeting Auth Roles (super_admin, admin, slod, imt, kiosk) and/or Member/Volunteer Service Roles (Prayer Coach, Backroom Support, IMT Support, VMT Support, OIC, Usher)
      3. Specific User: Mention-like autocomplete search picker with debounce and user card display
    - Notification payload consists of Title (required), Message (required), and an optional Destination URL
    - A confirmation gate modal is mandatory before dispatching any broadcast, showing full target details (avatars, names, roles, warning badges) and message preview
    - Recipients receive real-time in-app notification badges via Supabase Realtime and web push notifications on subscribed devices
    - Notification drawer / bell in the header allows users to view unread alerts, filter by All/Unread, mark individual items or all as read, and delete alerts
    - Web push subscriptions can be toggled on mobile PWAs and desktop browsers via the notification bell or member profile

  Scenario: Admin broadcasts notification to all users with confirmation gate
    Given I am logged in as an administrator on /admin/notifications
    When I fill in Title "Sunday Service Advisory" and Message "Service starts at 9:00 AM"
    And I select Target Audience "All Users"
    And I click "Send Broadcast"
    Then I see the confirmation modal with a "Mass Broadcast" warning
    And I see the notification message preview
    When I click "Confirm & Send"
    Then the broadcast is dispatched to all registered users
    And I see a success toast confirming the number of recipients

  Scenario: Admin cancels broadcast from confirmation gate
    Given I have filled out the notification broadcast form
    When I click "Send Broadcast"
    Then I see the confirmation modal
    When I click "Back to Edit"
    Then the confirmation modal closes
    And my form inputs are preserved without sending any notification

  Scenario: Admin broadcasts to multiple roles simultaneously
    Given I am on the notification broadcast page
    When I select Target Audience "Specific Roles"
    And I open the roles dropdown
    And I select "Admin" from Auth Roles and "Prayer Coach" from Member Roles
    And I click "Send Broadcast"
    Then the confirmation modal displays badge pills for "Admin" and "Prayer Coach"
    When I confirm the broadcast
    Then all users holding any of the selected roles receive the notification

  Scenario: Admin searches and selects specific user with autocomplete mention picker
    Given I am on the notification broadcast page
    When I select Target Audience "Specific User"
    And I type "@ces" into the user search input
    Then the system searches with a 300ms debounce
    And I see a list of matching users with avatars, names, emails, and member badges
    When I select "Cecile Vitalicio"
    Then the input transforms into a selected user card
    And when I click "Send Broadcast", the confirmation modal displays Cecile's avatar, name, and email

  Scenario: User receives and interacts with in-app notification
    Given a user has an active session
    When an admin broadcasts a notification targeting the user
    Then the user's notification bell increments the unread counter badge
    When the user opens the notification drawer
    Then the user sees the new notification card with unread indicator
    When the user clicks the notification card
    Then the notification is marked as read
    And the user is navigated to the notification's destination URL
