# Domain Glossary

## Core Roles and People

- Public User: A person who can browse events and register without admin access.
- Admin User: A trusted user who can manage events, registrations, members, and event-day operations.
- Member: A person with a profile identified by a unique member ID.
- Public Attendee: A non-member attendee who registers through the public self-registration flow.
- Check-In Staff (MVP): Admin users who perform event-day check-in in the initial release.

## Event Domain Terms

- Event: A schedulable activity that can accept registrations within a configured registration window.
- Registration Window: The period when registration is allowed, based on registration open and close date-time.
- Event Status: The lifecycle state of an event: Draft, Published, or Archived.
- Draft Event: An event being prepared by admins and not visible to public users.
- Published Event: An event visible to public users and eligible for registration based on the registration window.
- Archived Event: A read-only event kept for history and removed from public registration.
- Public Event Category: Public grouping by registration availability: Open, Upcoming, or Past.
- Event Availability Pre-Check: Validation that blocks registration when an event is unavailable by status or date-time.

## Registration Domain Terms

- Registration: A person's submitted response set for a specific event.
- Member Registration: A registration created through the member lookup flow.
- Public Registration: A registration created through public self-registration without member ID lookup.
- Registration Status: The lifecycle state of a registration: Submitted, Updated, or Cancelled.
- Active Registration: Any registration that is not cancelled.
- Duplicate Policy: Event rule controlling repeat submissions: Block or Allow Update.
- Block Duplicates: Duplicate policy that rejects repeat registration attempts for the same person and event.
- Allow Update: Duplicate policy that accepts repeat submission and replaces prior responses.
- Reactivation: Restoring a cancelled registration back to active status.
- Registration Confirmation Number: The user-facing identifier shown after successful registration.
- Id-First Registration Rule: The business invariant that member lookup is mandatory before member registration.
- Registration Wizard: Optional step-by-step registration interface that follows the same rules as the standard flow.
- Public Self-Registration: Email-based flow for attendees without a member ID.
- Kiosk Confirmation Timeout: The short confirmation-screen timer that returns users to member registration flow.

## Registration Fields and Responses

- Registration Field: A configurable question shown on an event registration form.
- Dynamic Field: Event-specific registration field defined by admins.
- Required Field: A field that must be completed before submission.
- Optional Field: A field that can be left blank without blocking submission.
- Field Key: Unique identifier for a registration field within an event; treated as immutable after creation.
- Field Snapshot Rule: Past registrations keep their original answers even when field configuration later changes.

## Member Domain Terms

- Member Lookup: Finding a member profile before registration using member ID or full name.
- Name Lookup Safety Rule: If name search returns multiple matches, results are withheld and user must refine search.
- Member ID: The unique identifier for a member profile used for lookup and registration.
- Member ID Update: Dedicated admin action for replacing a member's existing ID with a new unique ID.
- Member Profile: The saved person details used across registrations, including name and optional metadata.
- Role: A profile label describing function or participation type, such as attendee, volunteer, or staff.
- Category: A profile label used to group members for operational use, such as participant or organizer.

## Admin Operations and System Terms

- Admin Authentication Protection: Rule that only authenticated admins can access admin pages.
- Session Expiration: Automatic sign-out after inactivity, requiring login again.
- Rate Limit: Temporary usage cap that slows repeated actions to protect system fairness and safety.
- Empty State: Clear message shown when no records exist for a page or filter.
- Pagination: Splitting long lists into pages with selectable page size and page navigation.
- Registrations Export: CSV report for registration data, including statuses and registration responses.
- Attendance Export: Dedicated CSV report for attendance data, separate from registration export.

## Attendance Domain Terms

- Attendance Tracking: An event-level capability that allows organizers to record who actually came on event day.
- Attendance Enabled Event: An event where attendance tracking is turned on.
- Check-In: The action of marking a person as present at an event.
- Check-In Time: The recorded time when a person is first marked as present.
- First Check-In Rule: The business rule that keeps the first recorded check-in time as official, even if scanned again.
- Pre-Event Assignment: Organizer-managed assignment data prepared before event day, such as table, area, team color, or area leader.
- Assignment Field: A configurable event-day detail used for operations, separate from public registration questions.
- Walk-In: A person who is not pre-registered but is allowed to be added and checked in during event day when enabled.
- Walk-In Mode: Event setting that decides whether unregistered people can be added during check-in.
- Timeslot Attendance: Attendance tracking by defined service slots (for example 9AM, 12NN, 3PM) within the same event.
- Attendance Export: A dedicated attendance report file used after event day, separate from registration export.
- Check-In Staff (MVP): Admin users who perform event-day check-in in the initial release.
