Feature: Submit Form
  As a public user or member
  I want to fill out and submit a dynamic form
  So that I can provide feedback, sign up, or share requested information

  Context: Business Rules
    - Forms can have three target audiences: "members_only", "members_and_public", or "public_only"
    - "members_only" forms require a valid member ID or authenticated session
    - "public_only" forms collect guest information (first name, last name, email) instead of member IDs
    - "members_and_public" forms allow users to switch between member lookup and guest entry
    - If a member is logged in, they skip the member lookup step for member-allowed forms
    - The system checks the form's "duplicate policy" before allowing submission
    - Forms can include dynamic fields (text, select, checkbox, etc.)

  Scenario: Guest submitting a public form
    Given a form is configured for "public_only" audience
    When I navigate to the form submission page
    Then I see the guest information step
    When I fill in my first name, last name, and email
    And I proceed to the next step
    Then I see the dynamic form fields
    When I fill out all required fields and submit
    Then I see a success confirmation message

  Scenario: Member submitting a members-only form (not signed in)
    Given a form is configured for "members_only" audience
    And I am not signed in
    When I navigate to the form submission page
    Then I see the member lookup step
    When I enter my valid member ID
    And I proceed to the next step
    Then I see my profile information to confirm identity
    When I proceed to the form questions
    Then I see the dynamic form fields
    When I fill out all required fields and submit
    Then I see a success confirmation message

  Scenario: Member submitting a members-only form (signed in)
    Given a form is configured for "members_only" audience
    And I am signed into my member account
    When I navigate to the form submission page
    Then I bypass the member lookup step
    And I see my profile information directly
    When I proceed to the form questions
    And I fill out the fields and submit
    Then my submission is recorded under my member profile

  Scenario: Switching between member and guest modes
    Given a form is configured for "members_and_public" audience
    When I navigate to the form submission page
    Then I see the member lookup step by default (if not signed in)
    And I see an option to "Continue as Guest"
    When I click "Continue as Guest"
    Then I see the guest information step (first name, last name, email)
    And I see an option to "Lookup Member ID instead"

  Scenario: Submitting a form with a duplicate policy restriction
    Given a form has a duplicate policy that only allows one submission per person
    And I have already submitted this form
    When I navigate to the form and identify myself (as member or guest)
    Then I see a message indicating I have already submitted the form
    And I am prevented from submitting it again

  Scenario: Attempting to access an unpublished or missing form
    Given a form is in "draft" status or does not exist
    When I navigate to its submission URL
    Then I see a "Form Unavailable" message
    And I cannot see or fill out any fields
