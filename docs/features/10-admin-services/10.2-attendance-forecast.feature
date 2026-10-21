Feature: Sunday Attendance Forecast
  As an administrator
  I want to view a monthly and weekly forecast of Sunday service attendance
  So that I can identify staffing deficits, expect volunteer turnup rates based on past attendance, and adjust schedules accordingly

  Context: Business Rules
    - The forecast calculates the expected turnup of volunteers based on scheduled commitments and historical attendance scores.
    - Forecasts can be filtered by month, by individual Sunday (1st Sunday, 2nd Sunday, etc.), and by role group (e.g., Usher, Prayer Coach, Backroom).
    - Monthly summary statistics display total monthly quota, expected turnup, and total needed volunteers.
    - Administrators can toggle between a visual chart view and a tabular data view for each Sunday's forecast.
    - An integration with Volunteer Staffing Targets allows adjusting the required headcount per time slot and role.
    - Administrators can share forecast summaries as image cards or downloaded reports.

  Scenario: Admin views the monthly attendance forecast
    Given I am on the Sunday Attendance Forecast page
    When the page loads
    Then I see a monthly summary bar showing Total Monthly Quota and Expected Turnup
    And I see a "Monthly Attendance Trend" chart mapping the expected versus target staffing across all Sundays in the month
    And I see a list of chronological forecast cards for each Sunday in that month

  Scenario: Admin filters forecast by role group
    Given I am viewing the Sunday Attendance Forecast page
    When I select the "Usher" tab from the role group selector
    Then the monthly summary, trend chart, and Sunday cards update to display data strictly for "Usher" commitments
    And the "Individual Role Breakdown" section is hidden because a specific role is selected

  Scenario: Admin toggles forecast view between Chart and Table for a specific Sunday
    Given I am viewing a specific Sunday forecast card
    When I click the "Table" view toggle button
    Then the visual chart is replaced by a data table
    And the table displays columns for "SESSION", "TARGET", "SCHEDULED", "EXPECTED", and "VARIANCE"

  Scenario: Admin configures staffing targets
    Given I am on the Sunday Attendance Forecast page
    When I click the "Configure Targets" button
    Then a modal opens allowing me to set expected volunteer counts per role and per session slot (e.g., 9AM, 12NN, 3PM)
    And these targets update the "TARGET" and "VARIANCE" calculations on the forecast page when saved

  Scenario: Admin shares the forecast
    Given I am on the Sunday Attendance Forecast page
    When I click the "Share Forecast" button
    Then a modal opens showing a preview of the forecast share card
    And I can download or share the forecast image based on my device capabilities
