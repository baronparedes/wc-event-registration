Feature: Member Notes
  As an admin
  I want to view, add, and delete notes on a member's profile
  So that I can keep track of important information or interactions with the member

  Context: Business Rules
    - Only authorized admin users can view, add, or delete member notes
    - Notes are displayed in descending order (newest first)
    - Notes have a maximum length of 255 characters
    - A note must contain at least 1 character of non-whitespace text
    - Each note displays the author's name and the date/time it was created
    - The note input area shows a character count indicating the current length and maximum allowed
    - Users can delete notes (typically ones they have created, or based on admin privileges)

  Scenario: View empty member notes
    Given I'm on a member's detail page
    When the member has no notes attached to their profile
    Then I see a section titled "Member Notes"
    And I see a message saying "No notes yet."
    And I see a text area to add a new note

  Scenario: View existing member notes
    Given I'm on a member's detail page
    When the member has existing notes attached to their profile
    Then I see a section titled "Member Notes"
    And I see a list of notes displayed
    And each note shows the text content
    And each note displays the author's name and the creation date/time (e.g., "By John Doe on Oct 21, 2026, 10:00 PM")

  Scenario: Add a new member note successfully
    Given I'm on a member's detail page
    And I see the "Member Notes" section
    When I type a message less than or equal to 255 characters into the text area
    And I click the "Add Note" button
    Then the new note is saved to the member's profile
    And the text area is cleared
    And the new note appears in the list with my name and the current date/time
    And the character counter resets to 0 / 255

  Scenario: Attempt to add an empty note
    Given I'm on a member's detail page
    And I see the "Member Notes" section
    When I leave the text area empty or only type whitespace
    Then the "Add Note" button is disabled
    And I cannot submit the note

  Scenario: Attempt to add a note exceeding character limit
    Given I'm on a member's detail page
    And I see the "Member Notes" section
    When I type a message exceeding 255 characters into the text area
    Then the character counter indicates the limit is exceeded (e.g., in red text)
    And the "Add Note" button is disabled
    And I cannot submit the note

  Scenario: Delete a member note
    Given I'm on a member's detail page
    And the member has existing notes
    When I click the "Delete" (trash can) icon next to a specific note
    Then the note is removed from the member's profile
    And the note no longer appears in the list

  Scenario: View notes as a read-only user
    Given I'm on a member's detail page
    And my role only has read-only access (disabled mode)
    When I look at the "Member Notes" section
    Then I can see the list of existing notes
    But I do not see the text area to add a new note
    And I do not see the delete icons next to existing notes
