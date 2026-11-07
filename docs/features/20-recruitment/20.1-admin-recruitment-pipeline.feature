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
    - Recruiter Notes & Past Attempts Collaboration:
        - Reviewers can add multiple timestamped notes at any step without overwriting prior notes.
        - Notes are stored in `public.recruitment_step_notes` and display the author's compact avatar, name, and simplified timestamp (e.g. `Nov 7, 4:26 AM` in Manila timezone) without redundant role badges.
        - Step panels surface notes and past attempt history via compact header chips (`[ 🔄 Past Attempts (X) ]` and `[ 💬 Notes (X) ]`) that open dedicated lightweight dialogs, preserving screen density.
    - Schedule Cancellation:
        - Authorized reviewers can cancel a scheduled coaching session via "Cancel Schedule".
        - Cancelling clears both the scheduled date/time and the assigned reviewer/coach, resetting step status to `pending`.
        - A cancellation reason is strictly required and automatically appended to the step's recruiter notes thread for full auditability.
    - Responsive Validation Banners:
        - Form validation summaries (`FormErrorSummary` / `AlertBanner`) adapt responsively (`flex-col sm:flex-row`), ensuring error checklists maintain 100% card width without cramped line wrapping on mobile devices, with full-width action buttons for easy touch interaction.
    - DGroup Endorsement Resend Visibility:
        - The "Resend Endorsement Email / Link" action is strictly restricted to active applicants whose endorsement is awaiting leader review.
        - The action and its confirmation dialog are automatically hidden once the candidate is endorsed, declined, or deployed.
    - Multi-Endorsement Lifecycle & Leader Updates:
        - Only one endorsement request can be open/pending at a time for any given applicant.
        - Authorized reviewers ("admin", "super_admin", "slod", "vmt") can update DGroup leader details (Name, Email, Contact) via "Change DGroup Leader". Any existing pending request is automatically marked "cancelled" (superseded) and a new request link is dispatched.
        - Changing DGroup Leader When Already Endorsed: Reviewers can update the leader even after an applicant has been endorsed. Updating the leader resets the endorsement status back to "Pending Leader Review", immediately dispatches an endorsement invitation to the new leader, and re-locks Step 4 (Observation) and Step 9 (Deployment) until newly approved. Previous approved attestation answers and endorsement records are fully preserved in the applicant's historical audit trail ("Endorsement History"), and the "Resend Endorsement Link" action is automatically re-enabled.
        - When an endorsement was declined by a leader ("rejected"), reviewers can re-request endorsement via "Request Endorsement Again" to the same or updated leader with optional context notes.
        - Re-requesting resets the applicant's endorsement status back to "Pending Leader Review" and locks Step 4 / deployment until newly approved.
        - Past attempts are preserved in `approval_requests` and surfaced in a collapsible "Endorsement History" section on the DGroup Endorsement tab.
    - Recruiter Profile Editing:
        - Authorized reviewers can edit applicant profile details directly from the "Applicant Profile" tab via "Edit Details" (`EditApplicantDetailsDialog`) to correct typos or update contact, work, emergency, and spiritual background information.
        - Updates are processed atomically via the `update_profile` action of `update-recruitment-stage` using `editApplicantProfileSchema`.
        - If an applicant's email address is modified, their own-phone progress portal access (`/recruitment`) automatically reflects the new email on their next Google sign-in.
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
    - Lifecycle & Archive Protection:
        - Reviewers can archive active applicants with semantic destructive styling; archived applicants can be restored to active status at any time.
        - Deployed applicants cannot be archived; the archive action is strictly hidden/disabled once an applicant is deployed to preserve the audit trail of active members.
    - Stepper Navigation & Dialog Ergonomics:
        - The 9-step stepper renders with semantic theme tokens, displaying a continuous 2px primary border on the active stage without border clipping.
        - The scrollable track provides vertical breathing room (`py-1.5`) and uses sanitized focus styles (`outline-none`) to prevent browser-native focus rings from obscuring tab geometry.
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

  Scenario: Reviewer cancels a scheduled coaching session
    Given I am inspecting an applicant with an active scheduled coaching session
    When I click "Cancel Schedule"
    Then the cancel schedule confirmation dialog opens
    When I provide a required cancellation reason and confirm
    Then the session date and assigned coach are cleared
    And the step status returns to "pending"
    And the cancellation reason is appended to the recruiter notes thread

  Scenario: Reviewer repeats Step 4 Observation
    Given I am inspecting an applicant at Step 4 (Observation)
    When I evaluate the session and click "Schedule Another Observation"
    Then the applicant remains on Step 4
    And the observation attempt counter increments
    And a repetition transaction is logged in the transaction history

  Scenario: Reviewer archives and restores an applicant
    Given I am inspecting an active applicant
    When I click the destructive "Archive" button in the modal footer
    Then a confirmation dialog appears requiring an archive reason
    When I enter "Applicant requested pause until next term" as the archive reason
    And I click "Archive Applicant"
    Then the applicant status updates to "archived"
    And the archive reason is appended to the recruiter notes thread as "Archived: Applicant requested pause until next term"
    And an archived banner is displayed with a "Restore Applicant" option
    When I click "Restore Applicant" and optionally provide restoration notes
    Then the applicant status returns to "active"
    And the restoration note is recorded in the recruiter notes thread

  Scenario: Reviewer records a collaborative recruiter note
    Given I am inspecting an active applicant on the "9-Step Pipeline" tab
    When I click the "Notes" header chip to open the recruiter notes dialog
    And I type coaching feedback into the recruiter notes field and click "Add Note"
    Then the note is saved to the step notes thread
    And it displays my name, compact avatar, and simplified timestamp
    And previously recorded notes remain preserved in chronological order

  Scenario: Reviewer inspects and sorts transaction history
    Given I am inspecting an active applicant
    When I switch to the "Transaction History" tab
    Then transactions are sorted by newest activity first by default
    When I toggle the sort order to "Oldest First"
    Then transactions are displayed chronologically starting from Step 1 registration
    When I filter transactions by "Step 2"
    Then only Step 2 transaction records are displayed in the selected sort order

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

  Scenario: Resend endorsement link is hidden when endorsed or deployed
    Given I am inspecting an applicant who is already endorsed or deployed
    When I view the "Applicant Profile" or "DGroup Endorsement" tab
    Then the "Resend Endorsement Email" button is not visible
    And the awaiting endorsement notice is not displayed

  Scenario: Reviewer changes DGroup leader while endorsement is pending
    Given I am authenticated as an authorized reviewer
    And an applicant has a pending endorsement request
    When I click "Change DGroup Leader"
    And I enter the new leader's name, email, and contact number
    And I confirm the leader update
    Then the previous pending endorsement request is cancelled and superseded
    And a fresh endorsement request link is dispatched to the new leader
    And the applicant's DGroup info is updated

  Scenario: Reviewer re-requests endorsement after decline
    Given I am authenticated as an authorized reviewer
    And an applicant's endorsement was previously declined by their leader
    When I click "Request Endorsement Again"
    And I provide clarification notes and confirm the request
    Then a new endorsement invitation is sent to the leader
    And the applicant's endorsement status resets to "Pending Leader Review"
    And the previous decline is retained in the endorsement history section

  Scenario: Reviewer edits applicant profile details to fix typos or update contact info
    Given I am authenticated as an authorized reviewer
    And I am inspecting an active applicant on the "Applicant Profile" tab
    When I click "Edit Details" to open the edit applicant details dialog
    And I update the applicant's phone number, marital status, or spiritual background
    And I submit the form
    Then the applicant's profile details are updated atomically
    And a confirmation toast confirms the profile update
    And the updated details are immediately reflected across the review dialog and table

  Scenario: Reviewer changes DGroup leader when applicant is already endorsed
    Given I am authenticated as an authorized reviewer
    And an applicant has already been endorsed by their DGroup leader
    When I click "Change DGroup Leader"
    Then I see a warning notice that changing the leader will reset the endorsement status to pending
    When I enter the new leader's name, email, and mobile number and confirm the update
    Then a new endorsement request link is dispatched to the new leader
    And the applicant's endorsement status resets to "Pending Leader Review"
    And the previous endorsement and attestation answers remain preserved in endorsement history
    And Step 4 Observation and Step 9 Deployment gates are re-locked until newly endorsed
    And the "Resend Endorsement Email" button is re-enabled

  Scenario: Deployed applications cannot be archived
    Given I am inspecting a volunteer whose status is "deployed"
    When I view the applicant detail dialog
    Then the "Archive Applicant" button is hidden
    And the applicant's records are preserved without allowing lifecycle archiving

  Scenario: Reviewer schedules session with blank coach and completes after assignment
    Given I am authenticated as an authorized reviewer
    And an applicant is at a coaching step (Step 2, 3, 4, or 5)
    When I select a Sunday session date and time leaving the coach blank
    Then the "Save Schedule" button is enabled
    When I click "Save Schedule" and confirm the schedule modal
    Then the session is scheduled with an "Unassigned (Assign on service day)" badge
    And the "Complete Step" button remains disabled
    When the service day arrives and I assign a coach in the "Assigned To" picker
    Then the "Complete Step" button becomes enabled
    When I click "Complete Step"
    Then the step is completed and the assigned coach is recorded in transaction history


