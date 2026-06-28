Feature: Admin Authentication Protection
  As the system
  I want to require authentication before allowing access to admin pages
  So that only authorized admins can manage events, registrations, and members

  Context: Business Rules
    - All admin routes (/admin/*) require valid authenticated session
    - Public routes (home, event registration) are accessible without authentication
    - Unauthenticated users attempting to access admin pages are redirected to login
    - After login, users are redirected to their intended destination (if available)
    - Session persists across page refreshes and browser tabs
    - Session expires after inactivity period (default: 24 hours or configurable)
    - Expired sessions redirect to login with message: "Session expired. Please log in again."
    - Logout clears session and redirects to login page
    - User role is verified on each page load (admins table is source of truth)

  Scenario: Unauthenticated user redirected to login
    Given I am not logged in
    When I try to access /admin/events
    Then I am redirected to /admin/login
    And I see the login form

  Scenario: Authenticated user can access admin dashboard
    Given I am logged in as an admin
    When I navigate to /admin/events
    Then the events page loads
    And I see the events list
    And I can access admin features

  Scenario: Redirect to intended destination after login
    Given I am not logged in
    When I visit /admin/events
    And I am redirected to /admin/login
    And I log in successfully
    Then I am redirected back to /admin/events (my intended destination)
    And not to generic dashboard

  Scenario: Session persists on page refresh
    Given I am logged in
    When I refresh the browser (Cmd+R or F5)
    Then my session is maintained
    And I remain on my current page
    And I do not need to re-authenticate

  Scenario: Session persists across browser tabs
    Given I log in to admin dashboard in one tab
    When I open a new tab and visit /admin/registrations
    Then I am already authenticated
    And I can access admin pages in the new tab

  Scenario: Admin logout clears session
    Given I am logged in
    When I click "Logout" button
    Then my session is cleared
    And I am redirected to /admin/login
    And if I try to access /admin/events, I'm redirected to login

  Scenario: Session expires after inactivity
    Given I am logged in and have been idle for extended period (e.g., 24 hours)
    When I try to access an admin page
    Then my session has expired
    And I am redirected to /admin/login
    And I see message: "Your session has expired. Please log in again."

  Scenario: Non-admin user cannot access admin pages
    Given a user exists but is not in the admin list
    When they log in (if authentication allows non-admins)
    And they try to access /admin/events
    Then they are redirected
    And they see message: "Access denied. You do not have permission to access this page."

  Scenario: Role verification on each page load
    Given I am logged in
    When I am removed from admin list by another admin
    And I refresh an admin page
    Then my session is checked
    And if no longer admin, I'm logged out and redirected to login

  Scenario: Protected API endpoints require authentication
    Given I have a valid session token
    When I make API requests to admin endpoints (e.g., GET /api/admin/events)
    Then requests succeed with valid data
    When I make requests without valid token
    Then requests fail with: "Unauthorized" (401)
    And I am not given access to admin data

  Scenario: Login page not accessible when already authenticated
    Given I am already logged in
    When I navigate directly to /admin/login
    Then I am automatically redirected to /admin/events (or dashboard)
    And I do not see the login form

  Scenario: Public routes accessible without authentication
    Given I am not logged in
    When I visit: / (home), /events/[slug]/register, etc.
    Then these pages load normally
    And I can browse events and register without authentication
