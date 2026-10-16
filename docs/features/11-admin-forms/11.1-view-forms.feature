Feature: View Administrative Forms
  As an administrator
  I want to view a list of all dynamic forms
  So that I can manage them, check their status, and access their submissions

  Context: Business Rules
    - Forms are listed in an infinite-scroll table on desktop or cards on mobile
    - Forms have properties: Title, Slug, Audience, Duplicate Policy, Status, and Created Date
    - Admin with write access can Edit, Duplicate, configure Fields, and view Submissions
    - Admin with read-only access can only view Submissions
    - List can be searched by Title or Slug

  Scenario: View forms list on desktop
    Given I am an administrator with "canReadAdminData" permission
    And I am on desktop
    When I navigate to the Admin Forms page
    Then I see a list of forms in a table
    And each form row displays Title, Slug, Audience, Duplicate Policy, Status, and Created Date

  Scenario: View forms list on mobile
    Given I am an administrator with "canReadAdminData" permission
    And I am on a mobile device
    When I navigate to the Admin Forms page
    Then I see a list of forms as mobile cards
    And each card displays Title, Slug, Status, Created Date, Audience, and Duplicate Policy

  Scenario: Search for forms
    Given I am on the Admin Forms page
    And the page has loaded
    When I type a search term in the search input
    Then the forms list filters to match the search term in Title or Slug
    And I can clear the search to see all forms

  Scenario: Access form actions as a writer
    Given I am an administrator with "canWriteAdminData" permission
    When I am on the Admin Forms page
    Then I see actions for each form: Edit, Duplicate, Fields, and Submissions
    And I see a button to create a "New Form"

  Scenario: Access form actions as a reader
    Given I am an administrator with "canReadAdminData" permission but without "canWriteAdminData"
    When I am on the Admin Forms page
    Then I only see the "Submissions" action for each form
    And I do not see the "New Form" button
