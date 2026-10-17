Feature: View Hub Calendar
  As an administrator
  I want to view a monthly calendar of member schedules and milestones
  So that I can effectively oversee volunteer commitments and member life events

  Context: Business Rules
    - The calendar displays member service schedules specifically on Sundays.
    - Milestones (birthdays, wedding anniversaries) are shown on the exact dates they occur.
    - The calendar provides distinct desktop (monthly grid) and mobile (weekly breakdown) views.
    - Administrators can select a specific date to view detailed commitments and milestones.
    - Detailed views allow filtering schedules by role, confidence, and searching by name.
    - Members who are excused from their commitments are visually distinguished.

  Scenario: Admin views the calendar on a desktop
    Given I am authenticated as an administrator
    And I navigate to the Hub Calendar page on a desktop device
    Then I see a monthly calendar grid
    And each day cell displays the day number
    And Sunday cells display a count of scheduled members
    And cells with milestones display counts for birthdays and wedding anniversaries
    And cells show preview avatars for scheduled members and milestones

  Scenario: Admin views the calendar on a mobile device
    Given I am authenticated as an administrator
    And I navigate to the Hub Calendar page on a mobile device
    Then I see a list of weeks for the current month
    And I can select a specific week to see its days
    And each day in the selected week shows a summary of schedules and milestones

  Scenario: Admin navigates between months
    Given I am viewing the Hub Calendar for the current month
    When I click the "Previous month" button
    Then the calendar updates to show data for the previous month
    When I click the "Next month" button
    Then the calendar updates to show data for the next month
    When I click the "Today" button
    Then the calendar returns to the current month with today's date selected

  Scenario: Admin views detailed information for a specific day
    Given I am viewing the Hub Calendar
    When I click on a specific day with schedules and milestones
    Then a details section appears below the calendar
    And I see a list of birthdays and anniversaries for that day
    And I see a list of scheduled members grouped by time slot (e.g., 9AM, 12NN, 3PM)
    And members who are excused are clearly marked

  Scenario: Admin filters the detailed schedules view
    Given I am viewing the detailed schedules for a selected Sunday
    When I type "John" in the search input
    Then the list of schedules updates to show only members whose names match "John"
    When I select a specific role from the filter dropdown
    Then the list updates to show only scheduled members assigned to that role
