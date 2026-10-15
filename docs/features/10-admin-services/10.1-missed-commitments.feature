Feature: Missed Commitments Tracking
  As an administrator
  I want to track and view missed service commitments
  So that I can identify volunteers who did not show up for their scheduled slots and follow up appropriately

  Context: Business Rules
    - A missed commitment occurs when a volunteer is scheduled for a slot but does not have a "present" or "excused" status.
    - Administrators can view missed commitments filtered by time slot, status (absent, excused), role, or via search query (name, role, phone).
    - Commitments are grouped by volunteer, so an individual missing multiple slots (e.g., both 9AM and 11AM) appears as a single unified record with a multiplier indicator.
    - An export to CSV functionality allows downloading the missed commitments list for the currently filtered view.
    - The "Missed Commitments" metric card on the services dashboard displays the total count and provides drill-down functionality to view specific slots.

  Scenario: Admin views missed commitments for a specific time slot
    Given I am viewing the Services Dashboard
    When I click the missed commitments count for the "9AM" slot
    Then a modal opens displaying volunteers who missed the 9AM service
    And I can see their names, roles, and status (absent or excused)
    And the filter is pre-selected to "9AM"

  Scenario: Admin searches for a specific volunteer's missed commitments
    Given I have the Missed Commitments modal open
    When I enter "John" in the search input
    Then the list updates to only show John's missed commitments across all his scheduled roles and slots

  Scenario: Admin groups multiple missed slots for the same volunteer
    Given a volunteer missed both their "9AM" and "11AM" scheduled slots
    When I view the Missed Commitments modal with "All Slots" selected
    Then I see a single row for that volunteer
    And the row indicates multiple missed slots with a chronologically ordered list of their missed commitments

  Scenario: Admin exports missed commitments to CSV
    Given I have filtered the Missed Commitments modal to show "absent" volunteers for "9AM"
    When I click the "Export CSV" button
    Then a CSV file is generated and downloaded containing the filtered list of missed commitments
