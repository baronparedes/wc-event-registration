Feature: Analytics Dashboard and Reporting
  As an admin
  I want to see analytics and metrics about registrations and events
  So that I can understand attendance trends, identify issues, and make data-driven decisions

  Context: Business Rules (Planned)
    - Dashboard shows key metrics: total registrations, registration rate, completion status breakdown
    - Metrics available per-event and platform-wide (for global admins)
    - Charts/visualizations: line chart (registrations over time), pie chart (status breakdown), bar chart (by field)
    - Filterable by: event, date range, registration status
    - Export reports as PDF or Excel
    - Custom report builder: select metrics, filter, date range, format
    - Scheduled reports: auto-generate and email weekly/monthly
    - Real-time metrics available; historical data retained for 2 years
    - Anomaly detection: alerts if registration rate drops suddenly or spike detected

  Scenario: View main analytics dashboard
    Given I'm logged in as admin
    When I navigate to Analytics or Dashboard
    Then I see key metrics:
      - Total registrations (this event/all time)
      - Registration rate (percent of available spots filled)
      - Breakdown by status (Submitted, Updated, Cancelled)
      - Upcoming events with low registration (warnings)

  Scenario: Event-specific metrics
    Given I select a specific event
    When I view its analytics
    Then I see:
      - Registrations by day (line chart)
      - Breakdown by field responses (e.g., "Dietary: 40% Vegetarian, 30% Vegan")
      - Dropout rate (incomplete registrations)
      - Average time to complete registration

  Scenario: Time-based analytics
    Given an analytics view
    When I select a date range (e.g., last 30 days)
    Then metrics recalculate for that period
    And charts update to show trend over selected range

  Scenario: Registration status breakdown
    Given analytics dashboard
    When I look at status pie chart
    Then I see: "Submitted: 80%, Updated: 15%, Cancelled: 5%"
    And can click segments to drill down

  Scenario: Field response analysis
    Given registration forms collect dynamic fields
    When I view field analytics
    Then I see popular responses for each field
    And charts show: "Most common dietary preference: Vegetarian (45%)"

  Scenario: Export report as PDF
    Given I'm viewing analytics
    When I click "Export as PDF"
    Then a PDF report is generated
    And includes all visible charts and metrics
    And includes date/event filter info in report header

  Scenario: Export report as Excel
    Given I'm viewing analytics
    When I click "Export as Excel"
    Then a spreadsheet is generated
    And includes raw data (one row per metric)
    And preserves charts as embedded images

  Scenario: Custom report builder
    Given I want to create custom report
    When I click "Build Custom Report"
    Then I can select: which metrics, which events, date range, format (PDF/Excel)
    And preview report before generating
    And save report configuration for future use

  Scenario: Scheduled reports
    Given I set up weekly analytics report
    When I configure: weekly email, Monday 9 AM, metrics selection
    Then system auto-generates report each week
    And sends to my email
    And I can download from email link or dashboard

  Scenario: Anomaly alerts
    Given analytics monitoring enabled
    When registration rate suddenly drops (e.g., 20% fewer registrations than previous day)
    Then I receive alert: "Unusual activity detected: registrations dropped 20% today"
    And alert includes: possible reasons, suggested actions

  Scenario: Real-time metrics
    Given I'm viewing analytics
    When a new registration comes in
    Then the metrics update within seconds
    And I see live counts updating
    And timestamp shown: "Updated just now"

  Scenario: Comparative analytics
    Given multiple events exist
    When I view comparative metrics
    Then I can see: "Event A: 500 registrations, Event B: 300 registrations"
    And trends shown side-by-side for comparison

  Scenario: Retention period
    Given historical data exists
    When data is older than 2 years
    Then archived data becomes read-only
    And full analytics no longer available (only summary)
    And space cleaned up
