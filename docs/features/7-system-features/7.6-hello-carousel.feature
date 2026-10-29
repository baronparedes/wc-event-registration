Feature: Hello Image Carousel
  As a user
  I want to view a gallery of images in an interactive carousel
  So that I can see highlights or information presented visually

  Context: Business Rules
    - Carousel displays a set of images sequentially
    - Autoplay advances the image automatically at a set interval (4.5 seconds)
    - Users can manually navigate forward and backward
    - Users can toggle a fullscreen mode that locks scrolling and maximizes the image
    - Keyboard navigation is supported (Arrow keys for navigation, Space for play/pause, Escape to exit fullscreen)
    - Exiting or going home from fullscreen mode restores original page scroll and theme

  Scenario: View images with manual navigation
    Given I am viewing the carousel
    When I click the next button or press the right arrow key
    Then the carousel advances to the next image
    And if I am on the last image, it loops back to the first image

  Scenario: Autoplay advances images automatically
    Given the carousel is in autoplay mode
    When the autoplay interval passes
    Then the carousel advances to the next image automatically
    And I can pause autoplay by pressing the Space key or clicking the pause button

  Scenario: Enter and exit fullscreen mode
    Given I am viewing the carousel
    When I click the fullscreen toggle
    Then the carousel expands to fill the entire screen
    And the page background turns black and scrolling is locked
    When I press the Escape key or click the exit button
    Then the carousel returns to normal size
    And normal page scrolling is restored

  Scenario: Navigate home from carousel
    Given I am viewing the carousel
    When I click the Go Home button
    Then I am navigated back to the home page
    And if I was in fullscreen mode, fullscreen is automatically exited
