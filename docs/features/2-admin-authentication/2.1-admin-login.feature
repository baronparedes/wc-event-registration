Feature: Admin Login
  As an admin user
  I want to log in with email and password
  So that I can access the admin dashboard and manage events, registrations, and members

  Context: Business Rules
    - Admin authentication uses email and password credentials
    - Admin role is verified by checking if user exists in the admin accounts list
    - Login creates a secure session token (JWT) valid for extended period
    - Session persists across browser tabs and page refreshes
    - Invalid credentials show generic error message (do not reveal if email exists)
    - Login is rate-limited to prevent brute force attacks
    - Session expires after inactivity period or when user explicitly logs out
    - Only authenticated admins can access admin pages; unauthenticated users redirect to login

  Scenario: Admin successfully logs in with correct credentials
    Given I am on the admin login page
    And I have valid admin email and password credentials
    When I enter my email and password
    And I click "Sign In"
    Then I am authenticated successfully
    And I am redirected to the admin events dashboard
    And I see my email displayed in the admin header

  Scenario: Admin sees error with incorrect password
    Given I am on the admin login page
    When I enter a correct admin email but incorrect password
    And I click "Sign In"
    Then I see an error message: "Invalid email or password"
    And I remain on the login page
    And I am not authenticated

  Scenario: Admin sees error with non-existent email
    Given I am on the admin login page
    When I enter an email that does not have admin access
    And I enter any password
    And I click "Sign In"
    Then I see an error message: "Invalid email or password" (same generic message)
    And I remain on the login page
    And I am not authenticated

  Scenario: Login is rate-limited after multiple failed attempts
    Given I am on the admin login page
    When I enter incorrect credentials multiple times (e.g., 5+ attempts within 5 minutes)
    Then I see a message: "Too many login attempts. Please try again in a few moments."
    And the login form is disabled temporarily
    And I must wait before attempting to log in again

  Scenario: Remember session across page refreshes
    Given I have successfully logged in
    When I navigate away from the admin dashboard
    And I refresh the page or close/reopen the browser
    Then I am still logged in
    And I do not need to re-enter credentials
    And my session is preserved

  Scenario: Session persists across browser tabs
    Given I have logged in to the admin dashboard in one tab
    When I open a new tab and navigate to the admin dashboard URL
    Then I am automatically logged in
    And I see the same admin session in both tabs

  Scenario: Automatically redirect to login if session expires
    Given I am logged in and have been inactive for a long time
    When my session expires
    And I try to access an admin page
    Then I am redirected to the login page
    And I see a message: "Your session has expired. Please log in again."
    And I must re-enter credentials

  Scenario: Access admin login page when already logged in
    Given I am already logged in as an admin
    When I navigate directly to the login page URL
    Then I am automatically redirected to the admin events dashboard
    And I do not see the login form

  Scenario: Clear empty fields when page loads
    Given I am on the admin login page
    When the page loads
    Then the email and password fields are empty
    And the "Sign In" button is available
