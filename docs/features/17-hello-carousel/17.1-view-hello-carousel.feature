Feature: View Hello Carousel
  As a public user or member
  I want to view a welcome image carousel
  So that I can see highlights and important information in a visually engaging way

  Context: Business Rules
    - The carousel displays a predefined set of slides
    - Users can manually navigate through slides
    - Users can toggle auto-play functionality
    - Users can toggle fullscreen mode for an immersive experience
    - The carousel supports swipe gestures on touch devices

  Scenario: Initial load of the carousel
    Given I am a user on the Hello Carousel page
    When the page loads
    Then I should see the first slide of the carousel
    And the auto-play functionality should be paused by default
    And I should see controls for navigating slides, toggling auto-play, and toggling fullscreen

  Scenario: Manual slide navigation
    Given I am viewing the Hello Carousel
    When I click the "Next" button
    Then I should see the next slide in the sequence
    When I click the "Previous" button
    Then I should see the previous slide in the sequence

  Scenario: Toggling auto-play
    Given I am viewing the Hello Carousel
    And auto-play is currently paused
    When I click the "Play" button
    Then the carousel should automatically transition to the next slide after a set interval
    When I click the "Pause" button
    Then the automatic transitions should stop

  Scenario: Toggling fullscreen mode
    Given I am viewing the Hello Carousel in normal mode
    When I click the "Fullscreen" button
    Then the carousel should expand to fill the entire screen
    And the layout should adapt to the fullscreen view
    When I click the "Exit Fullscreen" button
    Then the carousel should return to its normal embedded size

  Scenario: Navigating back to home
    Given I am viewing the Hello Carousel
    When I click the "Go Home" button
    Then I should be navigated to the home page
