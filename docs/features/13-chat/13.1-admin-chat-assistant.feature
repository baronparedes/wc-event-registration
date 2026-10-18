Feature: Admin AI Chat Assistant
  As a hub administrator
  I want to interact with an AI Assistant
  So that I can get help, insights, and answers related to the hub operations

  Context: Business Rules
    - The AI Assistant is accessed via a dedicated chat interface in the admin panel
    - Responses from the AI are streamed in real-time
    - Chat history is preserved locally across sessions (within the same tab)
    - A sliding window of the last 10 messages is used for context
    - System should gracefully handle network errors or rate limits (e.g. coffee break message)
    - Admins can clear their chat history manually

  Scenario: View the AI assistant chat interface
    Given I am an authenticated hub administrator
    When I visit the admin chat page
    Then I should see the "AI Assistant" header with a "Beta" badge
    And I should see a warning that AI responses can be inaccurate
    And I should see a ready state or previous messages if available

  Scenario: Send a message to the AI assistant
    Given I am an authenticated hub administrator on the chat page
    When I enter a message in the chat input
    And I submit the message
    Then my message should appear in the chat history
    And I should see the AI assistant's response begin streaming in real-time
    And the chat window should automatically scroll to the bottom

  Scenario: Clear chat history
    Given I have an active conversation with the AI assistant
    When I click the "Clear Chat" button
    Then all messages should be removed from the interface
    And the chat history should be cleared from my session storage

  Scenario: Handling rate limits or quota errors
    Given I am on the chat page
    When I submit a message that triggers a rate limit or quota exhaustion
    Then the system should display a fallback message saying "I'm on a coffee break, you can come back later."
    And the interface should allow me to send messages again later

  Scenario: Preserving chat history across sessions
    Given I have a conversation with the AI assistant
    When I close and reopen the chat page within the same session
    Then I should see my previous messages restored
    And I can continue the conversation from where I left off
