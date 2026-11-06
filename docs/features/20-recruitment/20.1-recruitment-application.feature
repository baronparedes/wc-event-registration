Feature: Welcome Center Recruitment Application Workflow
  As an applicant to the Welcome Center ministry
  I want to apply for a role and track my progress
  So that I can complete all requirements to become a deployed volunteer

  Context: Business Rules
    - Recruitment can be open or closed based on global settings.
    - Authorized users (Admin, Super Admin, Kiosk, VMT) or applicants with an active session can access the form.
    - Applications track a target role (e.g., Usher, Prayer Coach, Backroom Support).
    - The recruitment pipeline consists of nine sequential steps:
      1. Registration and Biblical Survey
      2. Interview
      3. Orientation
      4. Observation
      5. Evaluation
      6. Prayer Coach Onboarding (only required for Prayer Coaches)
      7. CCF VMT Registration
      8. RFID and Service Commitments
      9. Deployment
    - Step 1 requires DGroup leader endorsement before moving forward.
    - Application status can be "active", "deployed", "declined", "withdrawn", or "on_hold".
    - Upon reaching the "deployed" status, the applicant is granted an RFID and officially joins the Welcome Center team.

  Scenario: Applicant views their recruitment progress
    Given I have an active Welcome Center recruitment application
    When I view the recruitment progress page
    Then I see my target role and current application status
    And I see a progress bar indicating my completion percentage
    And I see a timeline of the nine recruitment steps
    And the timeline indicates which steps are completed, pending, or locked

  Scenario: Applicant requires DGroup leader endorsement for Step 1
    Given I have submitted my application
    And my application is at Step 1 (Registration)
    When I view my application timeline
    Then I see the DGroup Leader endorsement status
    And I see an option to resend the endorsement email if it is still pending

  Scenario: Prayer Coach applicant completes Role-Specific Onboarding
    Given my target role is "Prayer Coach"
    And I reach Step 6 in the recruitment timeline
    When I view my application steps
    Then I see a requirement to serve one Sunday service as an Usher
    And the step must be completed to proceed

  Scenario: Non-Prayer Coach applicant bypasses Role-Specific Onboarding
    Given my target role is "Usher"
    And I reach Step 6 in the recruitment timeline
    When I view my application steps
    Then Step 6 is marked as "Skipped"

  Scenario: Applicant confirms CCF VMT Registration
    Given I am at Step 7 (CCF VMT Registration) in the timeline
    When I complete registration in the external CCF VMT database
    And I click "I Have Completed CCF VMT Registration" on my timeline
    Then my VMT registration status is updated to confirmed
    And I can proceed to the next step

  Scenario: Applicant selects Sunday service commitments and RFID release
    Given I am at Step 8 (RFID and Service Commitments)
    When I view my application steps
    Then I see the status of my assigned RFID card
    And I can select my preferred Sunday service commitments (e.g., 1st Sunday, 3rd Sunday)
    When I save my commitments
    Then my service commitments are recorded on my application

  Scenario: Applicant reaches Deployed status
    Given I have completed all required recruitment steps
    And an admin approves my final deployment
    When I view my recruitment progress page
    Then my status is shown as "deployed"
    And I see my assigned RFID and Sunday schedule
    And I see a link to open my full volunteer profile
