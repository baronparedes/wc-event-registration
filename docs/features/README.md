# Feature Documentation

Welcome to the Event Registration Platform feature documentation. This folder contains business-friendly feature descriptions in Gherkin format—designed to be read and understood by product managers, QA teams, business analysts, and stakeholders.

## What Is This?

Each `.feature` file describes one user-facing capability of the platform in plain business language, organized by epic (Public Registration, Admin Authentication, Admin Events, etc.).

**Key principle**: All features are written without technical jargon. You will not see database terms, HTTP status codes, code variable names, or implementation details. Instead, you'll read about what users can do and what the system ensures.

## How to Navigate

Features are organized into 8 epic folders:

### 1. Public Registration (6 features)

- **Browse Events**: Users view available events on the homepage
- **ID-First Lookup**: Users enter their member ID before registering
- **Register with Dynamic Fields**: Users complete event-specific registration form
- **Registration Wizard**: Alternative step-based UI for registration
- **Public Self-Registration**: Email-based public registration with duplicate guard and kiosk confirmation timeout
- **Public Capacity Rules**: Public registrations follow non-role option caps while role-allotted options remain role-neutral in public flow

### 2. Admin Authentication (1 feature)

- **Admin Login**: Admins authenticate to access management dashboard

### 3. Admin Events (5 features)

- **View Events**: Admins see paginated list of all events
- **Create Event**: Admins create new events with basic info
- **Edit Event**: Admins update event details and settings
- **Publish Event**: Admins publish events to make them public
- **Archive Event**: Admins archive completed events

### 4. Admin Fields (2 features)

- **Configure Event Fields**: Admins design registration form fields for each event
- **Configure Option Capacity by Role**: Admins define per-option role allotments with derived option totals

### 5. Admin Registrations (10 features)

- **View Registrations**: Admins see paginated list of registrations for an event
- **View Registration Detail**: Admins view complete registration record
- **Cancel Registration**: Admins cancel a member's registration
- **Reactivate Registration**: Admins restore a cancelled registration
- **Export Registrations**: Admins download registration data as CSV
- **Copy Registration Names**: Admins copy names and selected fields (including dynamic answers) to clipboard
- **View Public Registrations**: Admins see paginated list of public self-registrations for an event
- **View Public Registration Detail**: Admins view full details and responses for a public self-registration
- **Cancel Public Registration**: Admins cancel an active public self-registration
- **Reactivate Public Registration**: Admins restore a cancelled public self-registration

### 6. Admin Members (4 features)

- **View Members**: Admins see list of all members in the system
- **View Member Details**: Admins view or edit individual member profiles
- **Create Member**: Admins manually add new member to system
- **Update Member ID**: Admins change a member's ID (RFID or identifier)

### 7. System Features (4 features)

- **Auth Protection**: System restricts admin pages to authenticated users
- **Event Availability**: System prevents registration if event is not open
- **Error Handling**: System shows clear error messages to users
- **Pagination**: System handles large lists with cursor-based pagination

### 8. Event-Day Attendance Tracking (7 features)

- **Configure Attendance Settings**: Admins enable attendance tracking and set policies per event
- **Manage Pre-Event Attendance Data Collection**: Admins design and fill custom attendance fields before event day for registered and public self-registered attendees
- **Check-In Registered Attendees**: Admins check in registered attendees by name, email, or ID scan
- **Handle Unregistered Attendees via Same-Day Registration Reopen**: Admins route unregistered attendees through registration, then use normal check-in
- **Track Timeslot Attendance**: Admins record which timeslot each attendee occupies during event
- **Export Attendance CSV**: Admins download attendance data and status for post-event reporting
- **Bulk Edit Attendance Data via CSV**: Admins download template, bulk edit locally, and upload to update 100s of attendees at once

### 9. Future/Planned (5 features in `future/` subfolder)

- **Event Scoping**: Admins limited to their own events
- **Async CSV Export**: For large registration volumes
- **Analytics Dashboard**: Registration metrics and reporting
- **Member Import**: Bulk CSV upload for members
- **Role-Based Field Visibility**: Show/hide fields by member role

## How to Read a Feature File

Each feature file follows this structure:

```gherkin
Feature: [Business capability in plain language]
  As a [user role]
  I want to [what they can do]
  So that [business value/outcome]

  Context: Business Rules
    - Rule 1: ...
    - Rule 2: ...
    - Constraints: ...

  Scenario: [Human-readable description of a specific case]
    Given [starting condition]
    When [action user takes]
    Then [expected outcome]
    And [additional verification]

  Scenario: [Another case - perhaps an error scenario]
    Given [precondition]
    When [action]
    Then [expected behavior]
```

### Scenario Types

Each feature includes comprehensive scenarios covering:

1. **Happy Path** (~1-2 scenarios): Main workflow succeeds as expected
2. **Error Cases** (~1-2 scenarios): Invalid inputs, missing data, conflicts prevented
3. **Edge Cases** (~1-2 scenarios): Boundary conditions, state restrictions, special scenarios

Total: ~4-6 scenarios per feature for thorough coverage.

## Business Rules Section

Every feature includes a **Context** section at the top listing business rules in plain language. These are the non-negotiable constraints and requirements:

- **Validation rules**: What data is required or restricted
- **State restrictions**: What you can/cannot do in different states
- **Constraints**: Immutable fields, unique requirements, dependencies
- **Policies**: How the system makes decisions (e.g., duplicate policy rules)

## Typical Scenario Flow

Most scenarios follow this pattern:

```gherkin
Scenario: [What happens in this case]
  Given [I am in this situation / have this data / am in this state]
  When [I perform this action]
  Then [this outcome occurs]
  And [additional verification or cascade effect]
```

**Plain language example:**

```gherkin
Scenario: Member successfully completes registration
  Given I am viewing an open event and have looked up my member ID
  When I fill in all required registration fields and click Submit
  Then my registration is saved
  And I see a confirmation with my registration number
  And I can no longer edit my responses (unless event allows updates)
```

## How Business Teams Use This

### Product Managers

- Use features as the source of truth for product scope
- Share features with stakeholders to align on capabilities
- Reference features when prioritizing new work
- Track feature completion against roadmap

### QA / Test Teams

- Each scenario is a test case
- Verify all scenarios pass before shipping
- Use happy path for smoke tests
- Use error/edge scenarios for thorough test coverage

### Developers

- Reference features before starting work
- Ensure implementation satisfies all scenarios
- Use feature files to validate completeness
- Share features with stakeholders to confirm understanding

### Stakeholders / Business Users

- Read features to understand what the system can do
- No technical knowledge required to understand features
- Use scenarios to validate feature behavior
- Reference features in requirements and acceptance sign-offs

## Versioning & Updates

When features change:

1. Update the `.feature` file to reflect new behavior
2. Add a scenario for new behavior
3. Mark deprecated scenarios with `# DEPRECATED` if behavior changes
4. Commit with clear message: "feat(features): Add X capability to Y feature"

## Future Features

See the `future/` subfolder for planned capabilities not yet implemented. The `future/README.md` contains the product roadmap and estimated priorities.

## Questions?

If a feature is unclear or a scenario is ambiguous:

1. Check the Context section for business rules
2. Review similar features to understand pattern
3. Reach out to the product team for clarification

---

**Last updated**: 2026-07-05  
**Created for**: Event Registration Platform  
**Audience**: Product, QA, Development, Business Stakeholders
