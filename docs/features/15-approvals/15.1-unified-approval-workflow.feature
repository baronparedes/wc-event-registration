Feature: Unified Approval Workflow
  As a designated approver (such as a Service Leader of the Day - SLOD)
  I want to review and decide on pending approval requests
  So that I can accept or decline requests (e.g., service excuses, form submissions) securely and efficiently

  Context: Business Rules
    - Approvals track requests across various entities (e.g., service_excuse, form_submission).
    - Approvals are assigned to an email address and optionally a user ID.
    - Each approval has a secure, unique access_token that grants access to a tokenized review page without requiring login.
    - The review page displays the request details (title, summary, requester info, status, etc.).
    - An approver can submit a decision of "approved" or "rejected".
    - A rejection requires providing a reason/note in the decision notes field.
    - Approvals have an expiration date (token_expires_at). Expired tokens cannot be used to submit decisions.
    - Decisions update the approval status and record who made the decision and when.
    - An approval can also be delegated to another user (SLOD) from an authenticated admin view.

  Scenario: Approver views a pending request via secure token
    Given a pending approval request exists with a valid token
    When I visit the approval review page using the token in the URL
    Then I see the request details including title, requester name, and summary
    And I see options to approve or decline the request
    And the status is shown as "Pending"

  Scenario: Approver approves a pending request
    Given I am on the approval review page for a pending request
    When I select the "approved" decision
    And I submit the decision
    Then I see a success message confirming the approval
    And the request status updates to "approved"

  Scenario: Approver declines a pending request with required notes
    Given I am on the approval review page for a pending request
    When I select the "rejected" decision
    And I enter a reason in the decision notes
    And I submit the decision
    Then I see a success message confirming the decline
    And the request status updates to "rejected"

  Scenario: Approver attempts to decline without notes
    Given I am on the approval review page for a pending request
    When I select the "rejected" decision
    And I leave the decision notes field empty
    And I submit the decision
    Then I see a validation error stating "Please provide a reason or note when declining a request."
    And the decision is not submitted
    And the request status remains "pending"

  Scenario: Approver accesses an expired token link
    Given an approval request exists but its token has expired
    When I visit the approval review page using the token
    Then I see an error message indicating the link is invalid or expired
    And I cannot submit a decision

  Scenario: Authenticated admin delegates an approval request
    Given I am a signed-in administrator viewing a pending approval request
    When I select a different Service Leader (SLOD) to assign the request to
    And I submit the delegation
    Then the request's assigned email and user ID are updated
    And a success message confirms the delegation
