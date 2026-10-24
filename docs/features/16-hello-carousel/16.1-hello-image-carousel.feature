Feature: Hello Hub Image Carousel
  As a hub user (visitor or member)
  I want to view a welcome image carousel on the /hello route
  So that I can learn about the hub's story, mission, and values in an engaging, distraction-free gallery format

  Context: Business Rules
    - The /hello route serves as an onboarding/informational image gallery
    - Slides can auto-play with configurable intervals (default: 4.5s)
    - Fullscreen mode must lock screen scroll, change theme color to black, and hide browser chrome where possible
    - Carousel supports touch swiping, keyboard navigation (arrows to change, space to pause/play), and pointer interaction
    - Safe area insets (notches, curved corners on iOS/Android) must be respected in fullscreen mode, especially in landscape

  Scenario: View the carousel in default mode
    Given I navigate to the "/hello" route
    Then I should see the main ImageCarousel component
    And the page background is the standard hub background
    And I see the carousel header with Home button, slide indicator, title, playback controls, and fullscreen toggle
    And I see the current slide image centered
    And I see navigation dots and keyboard hints at the bottom

  Scenario: Auto-play functionality
    Given I am viewing the ImageCarousel
    And auto-play is enabled
    When 4.5 seconds pass
    Then the carousel should automatically transition to the next slide
    When I click the Pause button or press Spacebar
    Then the carousel should stop auto-playing

  Scenario: Manual navigation
    Given I am viewing the ImageCarousel
    When I click the Next arrow or press the Right Arrow key
    Then the carousel should transition to the next slide
    When I click the Previous arrow or press the Left Arrow key
    Then the carousel should transition to the previous slide
    When I swipe left on a touch device
    Then the carousel should transition to the next slide
    When I click a specific indicator dot
    Then the carousel should jump directly to that slide

  Scenario: Fullscreen mode engagement
    Given I am viewing the ImageCarousel
    When I click the Fullscreen toggle button
    Then the carousel enters fullscreen mode
    And the component expands to cover the entire viewport ("inset-0 fixed h-[100dvh]")
    And the background becomes solid black
    And the header changes layout (hidden in landscape mode)
    And floating landscape controls (Home, Close) become visible in landscape orientation
    And body scrolling is locked
    And the document theme-color changes to black

  Scenario: Fullscreen mode landscape layout and safe areas
    Given I am viewing the carousel in fullscreen mode
    When I rotate my device to landscape orientation
    Then the main header should be hidden
    And I should see floating "Home" and "Close" controls in the top corners
    And these controls and the next/prev arrows should respect device safe-area-insets (not hidden behind notches)

  Scenario: Exiting fullscreen mode
    Given I am viewing the carousel in fullscreen mode
    When I press the Escape key
    Or I click the Exit Fullscreen button (Minimize icon or 'X' in landscape)
    Then the carousel returns to its standard inline presentation
    And the background and body scrolling properties are restored to normal
