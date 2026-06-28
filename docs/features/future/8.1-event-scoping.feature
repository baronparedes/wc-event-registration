Feature: Event Scoping - Admin Limited to Their Events
  As an admin with limited scope
  I want to see and manage only events assigned to me
  So that large organizations can have multiple admins without visibility into all events

  Context: Business Rules (Planned)
    - Admin role extended with optional scope: global or event-scoped
    - Global admins (v1 current): can see and edit all events (full platform access)
    - Event-scoped admins (v2): can only see/edit events explicitly assigned to them
    - Event assignment managed by super-admin or global admin
    - Event-scoped admins cannot: publish/archive events outside their scope, see other admins' events, access member list
    - Event-scoped admins can: manage own events, view registrations for own events, create new events (assigned to self)
    - Filters in admin dashboard respect scope: "My Events", "All Events" (for global admins only)
    - Audit logs track which admin performs actions (already scoped by event)
    - Reports/exports include admin's scope information

  Scenario: Global admin sees all events
    Given I am a global admin
    When I navigate to Events page
    Then I see all events regardless of owner
    And I can edit any event

  Scenario: Event-scoped admin sees only assigned events
    Given I am an event-scoped admin assigned to "Summer Cleanup" and "Fall Festival"
    When I navigate to Events page
    Then I see only "Summer Cleanup" and "Fall Festival"
    And other events are hidden
    And count shows "2 events" (not total platform events)

  Scenario: Event-scoped admin cannot access unassigned event
    Given I am event-scoped admin without "Winter Gala" assignment
    When I try to visit /admin/events/winter-gala
    Then I see error: "You do not have access to this event"
    And I'm redirected to my events list

  Scenario: Event-scoped admin cannot see all members
    Given I am event-scoped admin
    When I navigate to Members page (if available)
    Then I see message: "You have access to [N] members who registered for your events"
    And not full member directory

  Scenario: New event assignment
    Given I am global admin assigning scope
    When I create or edit an admin account
    Then I can select which events they have access to
    And they can be assigned to: none, specific events, or all events (global)

  Scenario: Change admin scope after creation
    Given an admin already exists with assigned events
    When I (global admin) edit their scope
    Then I can add/remove event assignments
    And they immediately lose access to removed events

  Scenario: Event-scoped admin cannot reassign scope
    Given I am an event-scoped admin
    When I navigate to settings or admin management
    Then I cannot see other admins
    And I cannot change my own scope (read-only)

  Scenario: Audit trail respects scoping
    Given audit logs track admin actions
    When I (admin) view audit trail
    Then I see actions only for events I have access to
    And I cannot see actions by other admins on events outside my scope (unless global)

  Scenario: Reports generated per scope
    Given I am event-scoped admin
    When I generate a report (e.g., registration analytics)
    Then report includes only my assigned events
    And not platform-wide data

  Scenario: Delegation of event ownership
    Given I (global admin) want to transition ownership
    When I assign an event to a new admin
    Then they become primary contact for that event
    And original creator remains in audit trail
