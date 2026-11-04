Feature: Admin Recruitment Pipeline Management
  As an authorized recruitment reviewer (Administrator, SLOD, or VMT)
  I want to track, review, advance, and manage volunteer recruitment applications
  So that prospective Welcome Center volunteers are thoroughly evaluated, endorsed, equipped, and deployed

  Context: Business Rules
    - The Recruitment Pipeline page (/admin/recruitment) is restricted to users with admin, super_admin, slod, or vmt roles.
    - Reviewers can filter applicants by status (Active, Archived, Deployed, Declined, All), current step (Steps 1 to 9), and desired/confirmed role.
    - Reviewers can search applicants by name, nickname, email, phone number, or DGroup Leader name.
    - Authorized reviewers can export the full canonical dataset (42 columns) as a CSV file formatted with Manila timezone timestamps.
    - Inspecting an applicant opens a 5-tab review dialog:
        1. 9-Step Pipeline: Session scheduling, coaching rubrics, multi-entry recruiter notes thread, step progression, and repeatable steps.
        2. Biblical Survey: 20-question doctrinal responses, score summary, and interviewer explanation guide.
        3. DGroup Endorsement: Real-time endorsement status synchronized from approval records, 25 attestation answers, rating legend, and magic link resend.
        4. Applicant Profile: 40-field applicant background covering personal, demographic, work, emergency contact, CCF tenure, GLC status, and DGroup information, with interactive applicant photo editing (upload or live camera capture).
        5. Transaction History: Chronological audit trail of all schedules, completions, repetitions, and status changes.
    - Recruiter Notes Collaboration:
        - Reviewers can add multiple timestamped notes at any step without overwriting prior notes.
        - Notes are stored in `public.recruitment_step_notes` and display the author's name, role, avatar, and timestamp.
    - Applicant Photo & Deployment Migration:
        - Applicants can optionally upload an image or capture a live webcam photo during registration (Section 1 - Personal & Work Information), verified in Section 5 (Verification).
        - Images are processed client-side (max 1024x1024 JPEG at 0.85 quality) and stored in `member_avatars` at `avatars/recruitment/{application_id}.jpg`.
        - Reviewers can update the applicant's photo directly from the Applicant Profile tab.
        - On Step 9 deployment, `deploy_recruitment_applicant` atomically migrates `avatar_object_key` into `public.users`.
    - Step progression rules:
        - Step 1: Registration and DGroup endorsement request dispatch.
        - Step 2: Interview session scheduling and evaluation notes.
        - Step 3: Orientation attendance confirmation.
        - Step 4 (Observation): Requires DGroup Leader endorsement approval before proceeding; allows repeating observation sessions as needed.
        - Step 5 (Evaluation): Allows passing evaluation, repeating evaluation sessions, or returning to observation for additional mentoring.
        - Step 6 (Onboarding): Required for Prayer Coach candidates (serving 1 Sunday service as Usher); automatically skipped for all other ministry roles.
        - Step 7 (CCF VMT Registration): Records verified CCF VMT ID and registration date.
        - Step 8 (RFID Releasing & Commitments): Assigns a unique physical RFID member ID and configures 1st to 5th Sunday service slot commitments.
        - Step 9 (Deployment): Promotes the applicant into an active member record; restricted strictly to Administrators and SLODs (VMT reviewers have read-only access).
    - Reviewers can archive applicants with semantic destructive styling; archived applicants can be restored to active status at any time.
    - Dialogs maintain single scrollbar architecture, sticky headers/tabs/footers, 16px mobile gutters, and full-width footer actions on mobile viewports.

  Scenario: Reviewer views the recruitment pipeline dashboard
    Given I am authenticated with an authorized reviewer role ("admin", "super_admin", "slod", or "vmt")
    When I navigate to the Admin Recruitment Pipeline page
    Then I see applicant summary metrics for active, archived, and deployed candidates
    And I see a list of applications matching the default "Active" status filter
    And each entry displays the applicant's avatar, name, contact info, target role, current step badge, DGroup endorsement badge, survey score, and assigned reviewer

  Scenario: Reviewer searches and filters candidates
    Given I am on the Admin Recruitment Pipeline page
    When I search for "Grace"
    And I filter by status "Archived"
    And I filter by role "Prayer Coach"
    Then the list only displays matching applicants
    And each status badge uses semantic danger styling for archived records

  Scenario: Reviewer exports recruitment data as CSV
    Given I am on the Admin Recruitment Pipeline page
    When I click the "Export CSV" button
    Then a CSV file containing all 42 canonical recruitment columns is generated and downloaded
    And all date and time values are formatted in the Asia/Manila timezone

  Scenario: Reviewer inspects applicant details across 5 tabs
    Given I am on the Admin Recruitment Pipeline page
    When I click "Review" on an applicant's row
    Then the applicant review dialog opens with a single scrollable body
    And I can switch between "9-Step Pipeline", "Biblical Survey", "DGroup Endorsement", "Applicant Profile", and "Transaction History" tabs
    And the DGroup Endorsement tab reflects the live approval decision and leader attestation answers

  Scenario: Reviewer schedules a coaching session
    Given I am inspecting an active applicant on the "9-Step Pipeline" tab
    When I select an upcoming step and click "Schedule Session"
    Then a schedule confirmation dialog opens
    When I set the session date and time, assign a reviewer, and provide notes
    And I confirm the schedule
    Then the step is marked as scheduled
    And a new entry is recorded in the transaction history

  Scenario: Reviewer repeats Step 4 Observation
    Given I am inspecting an applicant at Step 4 (Observation)
    When I evaluate the session and click "Schedule Another Observation"
    Then the applicant remains on Step 4
    And the observation attempt counter increments
    And a repetition transaction is logged in the transaction history

  Scenario: Reviewer archives and restores an applicant
    Given I am inspecting an active applicant
    When I click the destructive "Archive" button in the modal footer
    Then a confirmation dialog appears warning of the archive action
    When I confirm the archive action
    Then the applicant status updates to "archived"
    And an archived banner is displayed with a "Restore Applicant" option
    When I click "Restore Applicant"
    Then the applicant status returns to "active"

  Scenario: Reviewer records a collaborative recruiter note
    Given I am inspecting an active applicant on the "9-Step Pipeline" tab
    When I type coaching feedback into the recruiter notes field and click "Add Note"
    Then the note is saved to the step notes thread
    And it displays my name, role, avatar, and the recorded timestamp
    And previously recorded notes remain preserved in chronological order

  Scenario: Reviewer updates applicant photo
    Given I am inspecting an applicant on the "Applicant Profile" tab
    When I click the camera icon on the applicant's avatar
    And I upload a new photo or capture a headshot with the webcam
    Then the applicant's avatar updates immediately
    And the new photo is saved to storage at "avatars/recruitment/{application_id}.jpg"

  Scenario: Administrator deploys a volunteer at Step 9
    Given I am authenticated as an "admin" or "slod"
    And I am inspecting an applicant who has completed Steps 1 through 8
    When I verify the assigned RFID and Sunday service commitments
    And I click "Deploy Volunteer" and confirm the deployment dialog
    Then the applicant is atomically promoted to an active WelcomeHub member
    And the application status transitions to "deployed"

