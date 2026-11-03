Feature: Admin Approvals Management
  As an administrator
  I want to view and manage all approval requests in the system
  So that I can review pending requests, delegate them to specific users, and make final decisions

  Context: Business Rules
    - The Admin Approvals Management page displays all approval requests in the system.
    - Administrators can filter requests by status (Pending, Approved, Rejected) and entity type.
    - Administrators can search requests by requester name, email, or title.
    - Administrators can view the full details of a request, including metadata.
    - Administrators can directly approve or decline a pending request.
    - A rejection requires providing a reason/note in the decision notes field.
    - Administrators can delegate a pending request to a Service Leader of the Day (SLOD).
    - Delegating a request updates the assigned email and sends a notification.
    - The list displays requester avatars, request titles, entity types, and timestamps.
    - The UI adapts for both desktop (table view) and mobile (card view) viewports.

  Scenario: Admin views all pending approval requests
    Given I am a signed-in administrator
    When I navigate to the Admin Approvals Management page
    Then I see a list of all approval requests
    And the default filter is set to "Pending" requests
    And I see key details for each request including the title, requester name, and created date

  Scenario: Admin searches and filters approval requests
    Given I am on the Admin Approvals Management page
    When I search for "John Doe"
    And I filter the list by the "service_excuse" entity type
    Then I only see requests submitted by "John Doe" related to service excuses

  Scenario: Admin inspects request details
    Given I am on the Admin Approvals Management page
    When I select a specific approval request to view
    Then a modal opens displaying the full request details
    And I see the requester's profile, request metadata, and current assignment
    And if the request is decided, I see the decision record and notes

  Scenario: Admin directly approves a pending request
    Given I am inspecting a pending approval request
    When I provide optional decision notes
    And I click the "Approve Request" button
    Then the request is marked as "approved"
    And a success message is displayed
    And the request status is updated in the list

  Scenario: Admin directly declines a pending request
    Given I am inspecting a pending approval request
    When I provide required decision notes explaining the rejection
    And I click the "Decline" button
    Then the request is marked as "rejected"
    And a success message is displayed
    And the request status is updated in the list

  Scenario: Admin delegates a request to a SLOD
    Given I am inspecting a pending approval request
    When I select a SLOD user from the delegation dropdown
    And I click the "Assign & Notify" button
    Then the request is reassigned to the selected SLOD
    And a success message confirms the delegation
    And the new assignment is reflected in the request details
