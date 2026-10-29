Feature: View Member Profile
  As an authenticated admin or member
  I want to view a member's profile
  So that I can see their personal information, activity, and related records

  Context: Business Rules
    - Access is restricted to authenticated users (admin or the member themselves)
    - Unauthenticated users attempting to view the profile are redirected to the login page with a return URL
    - If the requested profile does not exist or fails to load, the user is redirected to the homepage
    - The profile is displayed in an AdminPageShell layout
    - The profile header displays an avatar (falling back to nickname+lastname or fullname), role, category, member ID, and last activity date
    - Information is organized into four main tabs: Info, Events, Forms, and Commitments
    - The Info tab shows personal details, Discipleship Group info, Sunday Availability, and allows managing device Push Notifications
    - "Commitments" tab is represented as "service_attendance" in the URL query parameter for backwards compatibility

  Scenario: Unauthenticated user attempts to view a profile
    Given I am an unauthenticated user
    When I attempt to access a member profile page
    Then I am redirected to the login page
    And the redirect URL includes the original profile path as a search parameter

  Scenario: User attempts to view a non-existent profile
    Given I am an authenticated user
    When I attempt to access a profile that does not exist
    Then I am redirected to the homepage

  Scenario: View member profile header
    Given I am viewing a valid member profile
    Then I see a WelcomeHelloBanner background
    And I see the member's avatar
    And I see the member's display name
    And I see their role, category, and member ID
    And I see a badge showing their last activity date if available

  Scenario: Navigate profile tabs
    Given I am viewing a member profile
    When I click on the "Events" tab
    Then the "Events" tab becomes active
    And the URL search parameters are updated to include "tab=events"
    And I see the member's event history
    When I click on the "Commitments" tab
    Then the "Commitments" tab becomes active
    And the URL search parameters are updated to include "tab=service_attendance"
    And I see the member's service attendance history

  Scenario: View Info tab contents
    Given I am viewing the "Info" tab of a member profile
    Then I see a "Personal Details" section containing email, phone, date of birth, and civil status
    And I see a verified badge next to the email if the member has an account
    And I see a "Discipleship Group (DGroup)" section
    And I see a "Sunday Availability" section
    And I see a "Push Notifications" section if the device supports them

  Scenario: Manage Push Notifications
    Given I am viewing the "Info" tab
    And my device supports push notifications
    When I click the subscribe/unsubscribe button
    Then my device's subscription status is toggled
    And I see a success toast notification upon successful update
