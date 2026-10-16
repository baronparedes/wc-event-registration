Feature: View Form Submissions
  As an administrator
  I want to view submissions for a specific form
  So that I can analyze the collected data

  Context: Business Rules
    - Both write and read-only admins can view submissions
    - Submissions are listed for a specific form
    - Admins can view the details of individual submissions
    - Admins can export submissions to a CSV file

  Scenario: Access form submissions
    Given I am an administrator with "canReadAdminData" permission
    When I click "Submissions" for a specific form on the Admin Forms page
    Then I am directed to the Submissions page for that form
    And I see a list of submissions with key identifier information

  Scenario: View submission details
    Given I am on the Submissions page for a form
    When I click on a specific submission
    Then a detail dialog or panel appears
    And I see all the data submitted by that respondent

  Scenario: Export submissions
    Given I am on the Submissions page for a form
    When I click the "Export" button
    Then a CSV file containing all submissions for that form is generated and downloaded
