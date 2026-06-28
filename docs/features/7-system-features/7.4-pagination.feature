Feature: Pagination and Data Fetching
  As the system
  I want to handle large datasets with efficient pagination
  So that pages load quickly and users can navigate through data manageable chunks

  Context: Business Rules
    - Pagination uses cursor-based approach (more efficient than offset-based)
    - Default page size: 20 items per page
    - Available page sizes: 20, 50, 100 (configurable)
    - Page size selection is remembered per user session
    - Pagination controls: First, Previous, Next, Last page buttons
    - Current page indicator shown (e.g., "Page 1 of 10")
    - Disabled buttons grayed out (e.g., First/Previous on page 1)
    - Total item count displayed when available
    - Search/filter selections preserved across pagination
    - Loading state shown while fetching next page

  Scenario: View first page of results
    Given I navigate to a list page (events, registrations, members)
    When the page loads
    Then I see first page of results (20 items by default)
    And pagination controls show at bottom
    And "First" and "Previous" buttons are disabled (on first page)
    And "Next" and "Last" buttons are enabled

  Scenario: Navigate to next page
    Given I'm viewing page 1 of results
    When I click "Next"
    Then page 2 loads
    And new results appear
    And pagination controls update to show current page
    And previous page results are replaced

  Scenario: Navigate to previous page
    Given I'm viewing page 3 of results
    When I click "Previous"
    Then page 2 loads
    And results from page 2 appear
    And pagination controls update accordingly

  Scenario: Jump to first page
    Given I'm viewing page 5 or later
    When I click "First"
    Then page 1 loads immediately
    And pagination controls reset

  Scenario: Jump to last page
    Given I'm viewing an earlier page
    When I click "Last"
    Then final page loads
    And number of results is less than or equal to page size
    And pagination controls show final page state

  Scenario: Change page size
    Given I'm viewing a list with default page size (20)
    When I click page size dropdown
    Then I see options: 20, 50, 100
    And I select 50
    Then page reloads with 50 items per page
    And pagination controls adjust
    And my selection is remembered for next session

  Scenario: See page indicator
    Given I'm viewing a paginated list
    When I look at pagination controls
    Then I see: "Page X of Y" or similar indicator
    And total pages count is accurate

  Scenario: See item count
    Given I'm viewing a list
    When the page loads
    Then I see: "Showing X to Y of Z total items"
    And counts are accurate for current page

  Scenario: Search filter persists across pagination
    Given I searched for "Community" on events list
    When I click "Next" page
    Then search filter remains active
    And page 2 shows filtered results (only events matching "Community")
    And not all events

  Scenario: Status filter persists across pagination
    Given I filtered registrations by status "Cancelled"
    When I navigate between pages
    Then filter remains active
    And each page shows only "Cancelled" registrations

  Scenario: Loading state during page fetch
    Given I click "Next" to fetch another page
    When the data is being fetched
    Then I see a loading indicator (spinner, skeleton, or placeholder)
    And pagination controls may be disabled during fetch
    And old results remain visible until new page loads

  Scenario: Handle empty result set
    Given a search returns zero results
    When I view the results page
    Then I see empty state message: "No results found"
    And pagination controls are hidden (no pages to show)

  Scenario: Handle large result set
    Given 10,000+ items exist
    When I use pagination
    Then navigation remains fast
    And each page loads within reasonable time (< 2 seconds)
    And "Last" button works for jumping to final page

  Scenario: Cursor-based pagination is efficient
    Given a large table with millions of rows
    When I navigate through pages
    Then each page loads efficiently (not scanning all previous rows)
    And Last page button works quickly (doesn't count all rows)

  Scenario: Responsive pagination on mobile
    Given I'm on a mobile device (small screen)
    When I view a paginated list
    Then pagination controls are responsive and touch-friendly
    And page size options are appropriately sized
    And buttons are large enough to tap accurately

  Scenario: Sort and pagination work together
    Given I sorted registrations by "Submission Date"
    When I navigate between pages
    Then sort order is maintained across pages
    And each page shows sorted results
    And pagination respects current sort
