Feature: Standardized UI States (Loading and Empty)
  As the system
  I want to present consistent loading indicators and empty states across all pages
  So that users have clear context when data is being fetched or when no data exists

  Context: Business Rules
    - Loading states are used whenever data is fetched asynchronously
    - Loading states provide contextual messages (e.g., "Loading registrations...") instead of just a generic spinner
    - Loading states can be displayed vertically (centered on a page) or horizontally (inline within smaller components)
    - Empty states are displayed when a query returns zero results
    - Empty states include a clear icon, title, description, and optional call-to-action button
    - Empty states replace generic "No data" text with branded, visually structured components
    - Assistive technology (screen readers) are provided hidden descriptive text when visual spinners lack visible labels

  Scenario: View loading state during data fetch
    Given I navigate to a page or section that requires data (e.g., Registrations List)
    When the asynchronous request begins
    Then I see a loading state indicator
    And a contextual message explaining what is loading (e.g., "Loading registrations...")
    And the page shell remains stable to avoid layout shift

  Scenario: View horizontal loading state in compact spaces
    Given I trigger an action in a compact component (e.g., a modal or sidebar)
    When the action requires asynchronous processing
    Then I see an inline horizontal loading state
    And the spinner is accompanied by a brief loading message next to it

  Scenario: View empty state when no data exists
    Given I view a list or table (e.g., form submissions or search results)
    When the server returns an empty data set
    Then the table or list is replaced by a standardized empty state component
    And it displays a relevant icon
    And it shows a clear title indicating no results (e.g., "No submissions found")
    And it provides a descriptive message or instructions

  Scenario: Empty state with a call to action
    Given I am viewing a dashboard with no items
    When the empty state is displayed
    Then it includes an actionable button (e.g., "Create your first event")
    And clicking the button navigates me to the appropriate creation flow

  Scenario: Screen reader support for loading states
    Given I use a screen reader
    When a loading state appears without a visible text message
    Then the screen reader announces a visually hidden fallback text (e.g., "Loading...")
    And the visual spinner uses appropriate aria attributes (aria-hidden="true")
