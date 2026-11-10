Feature: App Drawer Navigation
  As a user or administrator
  I want a consistent, context-aware side navigation drawer
  So that I can easily move between the global dashboard, admin sections, and specific active workspaces

  Context: Business Rules
    - The App Drawer Navigation is accessible via a toggle button in the App Shell Header or swiping on mobile devices
    - Navigation items are dynamically rendered based on authentication status and specific Admin permissions
    - Global Navigation items (Hub, Profile, Sign In/Out) are visible based on authentication state
    - Admin Navigation items appear only for authenticated admins and are filtered by specific read/write permissions
    - Context-specific workspaces (Event, Form, Member, Attendance) appear when the current route is within that specific entity's scope
    - The drawer displays the current user's profile and privacy/terms links at the bottom when authenticated
    - The drawer overlays the main content and can be closed via a close button or clicking outside the drawer

  Scenario: Unauthenticated User Navigation
    Given I am an unauthenticated user
    When I open the App Drawer Navigation
    Then I see the "Hub" main navigation item
    And I see a "Sign In" navigation item
    And I do not see any Admin or Workspace navigation sections

  Scenario: Basic Authenticated Member Navigation
    Given I am a standard authenticated member without admin privileges
    When I open the App Drawer Navigation
    Then I see "Hub" and "My Profile" main navigation items
    And I do not see the "Sign In" navigation item
    And I see my user identity and a "Sign Out" button at the bottom of the drawer
    And I do not see any Admin navigation sections

  Scenario: Admin Navigation Rendering based on Permissions
    Given I am an authenticated administrator with "canReadAdminData" and "canAccessAttendanceCheckIn" permissions
    When I open the App Drawer Navigation
    Then I see the Admin section heading
    And I see navigation items for "Approvals", "Recruitment", "Manage Events", "Manage Forms", and "Chat with Hub AI"
    And I do not see navigation items for "Manage Members", "Manage Services", or "Settings"

  Scenario: Context-Aware Event Workspace Navigation
    Given I am an authenticated administrator with write permissions
    And I am currently viewing an event details page (e.g., `/admin/events/123`)
    When I open the App Drawer Navigation
    Then I see an "Event Workspace" section with the title of the event
    And I see navigation items for "Manage Event", "Manage Registration Fields", "Manage Registrations", and "Manage Public Registrations"
    And I see an "Attendance" section with navigation items for "Check-In", "Attendance Fields", "Attendee Details", "Attendance Dashboard", and "Unregistered Members"
    And I do not see Form or Member workspace sections

  Scenario: Context-Aware Form Workspace Navigation
    Given I am an authenticated administrator with write permissions
    And I am currently viewing a form details page (e.g., `/admin/forms/456`)
    When I open the App Drawer Navigation
    Then I see a "Form Workspace" section with the title of the form
    And I see navigation items for "Manage Form", "Manage Form Fields", and "Manage Submissions"
    And I do not see Event, Attendance, or Member workspace sections

  Scenario: Context-Aware Member Workspace Navigation
    Given I am an authenticated administrator with "canReadAdminMemberData" permissions
    And I am currently viewing a member profile page (e.g., `/admin/members/789`)
    When I open the App Drawer Navigation
    Then I see a "Member Workspace" section with the member's full name
    And I see navigation items for "Edit Member", "Service Attendance", and "Event History"
    And I do not see Event, Form, or Attendance workspace sections

  Scenario: Sign Out Interaction
    Given I am an authenticated user with the drawer open
    When I click the "Sign Out" button at the bottom of the drawer
    Then my session is terminated
    And the drawer closes automatically
    And I am redirected to the public view or login page as appropriate
