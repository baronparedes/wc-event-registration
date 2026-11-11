Feature: Stand-In Recommender Modal
  As a hub calendar administrator
  I want to find and contact reliable substitute volunteers for a specific role and time slot
  So that I can quickly fill empty spots caused by excused members or shortages

  Context: Business Rules
    - Recommendations are based on volunteers matching the required role, schedule availability, and their historical attendance reliability (turnup rate).
    - Administrators can request multiple stand-ins (up to 15).
    - Candidates are ranked, and top matches are highlighted.
    - The system provides personalized outreach templates for Viber, SMS, and Email.
    - Administrators can select candidates and either copy bulk recipient lists/messages or use 1-click individual outreach.

  Scenario: Admin views stand-in recommendations
    Given I am authenticated as an administrator
    And I open the Stand-In Recommender modal for a specific date, time slot, and role
    Then I see a list of recommended walk-in candidates
    And each candidate displays their name, contact info, attendance reliability tier, and a reasoning for their recommendation
    And the top ranked candidate is marked as "Top Match"
    And I can adjust the number of needed walk-ins using a stepper

  Scenario: Admin selects candidates for outreach
    Given I am viewing the Stand-In Recommender modal with a list of candidates
    When I click "Select All"
    Then all recommended candidates are selected
    When I click "Select Top N"
    Then only the top N candidates are selected based on the needed count
    When I click "Clear"
    Then all candidates are deselected

  Scenario: Admin previews and copies invitation messages
    Given I have selected one or more candidates in the Stand-In Recommender
    When I select an outreach channel (Viber, SMS, or Email)
    Then I see a preview of the message template
    And I can click "Copy Template" to copy the generic template to my clipboard
    And I can click "Copy All Messages" to copy personalized messages for all selected volunteers
    And I can click "Copy Email List" or "Copy Numbers" to copy the contact details of selected volunteers

  Scenario: Admin uses 1-click direct outreach
    Given I have selected one or more candidates in the Stand-In Recommender
    When I look at the "1-Click Direct Outreach" section
    Then I see a list of my selected candidates
    And I can click the "Copy" icon next to a candidate to copy their personalized message
    And if the Email channel is active, I can click "Email" to open my mail client with a pre-filled message
    And if the Viber or SMS channel is active, I can click the contact button to open the respective messaging app
