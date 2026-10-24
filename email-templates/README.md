# Email Templates Directory

This directory contains standalone, responsive HTML email templates designed for importing directly into [Resend](https://resend.com/templates) or using as production reference layouts.

---

## System Template Inventory & Source Locations

Welcome Hub tracks 5 email template slugs in `public.email_templates`. Depending on the notification type, template source layouts reside either as **standalone HTML files in this directory**, **hosted directly inside the Resend Dashboard**, or as **programmatic in-code builders**:

| Database Slug                   | Template Name                 | Source / Location                                                              | Configured Resend ID                                        | Purpose                                                                         |
| :------------------------------ | :---------------------------- | :----------------------------------------------------------------------------- | :---------------------------------------------------------- | :------------------------------------------------------------------------------ |
| `volunteer-schedule`            | Volunteer Schedule Reminder   | **Hosted in Resend Dashboard**                                                 | `volunteer-schedule`                                        | Automated Friday email reminder sent to volunteers scheduled for Sunday service |
| `approval-review-request`       | Approval Review Request       | **[`approval-review-request.html`](approval-review-request.html)**             | `tmpl_approval_review_placeholder` _(or custom Resend ID)_  | Review notice with tokenized link sent to SLOD reviewers and admins             |
| `approval-outcome-notification` | Approval Outcome Notification | **[`approval-outcome-notification.html`](approval-outcome-notification.html)** | `tmpl_approval_outcome_placeholder` _(or custom Resend ID)_ | Decision outcome (Approved / Declined) sent to requester                        |
| `broadcast`                     | Broadcast Notification        | **In-code builder** (`_shared/emailTemplate.ts`)                               | `tmpl_broadcast_placeholder` _(or custom Resend ID)_        | Multi-channel broadcast messages sent by administrators                         |
| `sunday-executive-debrief`      | Sunday Executive Debrief      | **In-code builder** (`_shared/emailTemplate.ts`)                               | `tmpl_sunday_debrief_placeholder` _(or custom Resend ID)_   | Service stats, turnup rate, and executive summary sent to OICs                  |

---

## Standalone HTML Templates in this Directory

The `.html` files in this directory are production-ready email templates designed for importing into [Resend Templates](https://resend.com/templates) or using as reference HTML layouts:

### 1. [`approval-review-request.html`](approval-review-request.html)

- **Database Slug**: `approval-review-request`
- **Purpose**: Sent to assigned SLOD reviewers and administrators when an action requires review and sign-off.
- **Mustache Tags in HTML**: `{{{subject_title}}}`, `{{{heading}}}`, `{{{description}}}`, `{{{review_url}}}`, `{{{action_url}}}`, `{{{action_text}}}`, `{{{details_html}}}`
- **Metadata Passed via Queue Payload**:
  ```json
  {
    "target_type": "approval-request",
    "approval_id": "03fa4510-9b43-424a-9db2-1e9bf4d28d08",
    "access_token": "a4d3f58b92...",
    "subject_title": "Long Leave: Juan Dela Cruz",
    "heading": "Approval Required",
    "description": "A request requires your review and approval:",
    "review_url": "https://welcomehub.app/approvals/review/a4d3f58b92...",
    "action_url": "https://welcomehub.app/approvals/review/a4d3f58b92...",
    "action_text": "Review & Take Action",
    "details_html": "<div style=\"margin: 0 0 6px 0;\"><span style=\"color: #71717a; font-weight: 600;\">Dates:</span><strong style=\"color: #0f172a; margin-left: 6px;\">Oct 25 – Nov 22, 2026 (4 Sundays)</strong></div>",
    "dates": "Oct 25 – Nov 22, 2026 (4 Sundays)",
    "requester_name": "Juan Dela Cruz",
    "reason": "Family vacation"
  }
  ```
- **Metadata Fields**:
  | Key | Type | Description |
  | :--- | :--- | :--- |
  | `subject_title` | `string` | Display title for headers and email subject |
  | `heading` | `string` | Prominent header card title (defaults to `"Approval Required"`) |
  | `description` | `string` | Context notice for the reviewer |
  | `review_url` / `action_url` | `string` | Secure tokenized review URL (`/approvals/review/:token`) |
  | `action_text` | `string` | Call-to-action button label (defaults to `"Review & Take Action"`) |
  | `details_html` | `string` | Formatted HTML rows showing request details |
  | `approval_id` | `string` | UUID of the `public.approval_requests` record |
  | `access_token` | `string` | Secure random token for passwordless sign-off |
  | _(spread entity details)_ | `string` | Dynamic fields extracted from request (e.g. `dates`, `requester_name`, `reason`, etc.) |

---

### 2. [`approval-outcome-notification.html`](approval-outcome-notification.html)

- **Database Slug**: `approval-outcome-notification`
- **Purpose**: Sent to the requester (member or public submitter) once an approval request has been resolved.
- **Mustache Tags in HTML**: `{{{title}}}`, `{{{requester_name}}}`, `{{{decision}}}`, `{{{decision_label}}}`, `{{{notes}}}`
- **Metadata Passed via Queue Payload**:
  ```json
  {
    "target_type": "approval-outcome",
    "approval_id": "03fa4510-9b43-424a-9db2-1e9bf4d28d08",
    "decision": "approved",
    "decision_label": "Approved",
    "title": "Long Leave: Juan Dela Cruz",
    "requester_name": "Juan Dela Cruz",
    "notes": "Approved by Leadership. Enjoy your leave!"
  }
  ```
- **Metadata Fields**:
  | Key | Type | Description |
  | :--- | :--- | :--- |
  | `title` | `string` | Request title (e.g. `"Long Leave: Juan Dela Cruz"`) |
  | `requester_name` | `string` | Name of the person who submitted the request |
  | `decision` | `string` | Raw decision slug: `"approved"` or `"rejected"` |
  | `decision_label` | `string` | Formatted status badge label: `"Approved"` or `"Declined"` |
  | `notes` | `string` | Reviewer remarks, justifications, or special instructions |
  | `approval_id` | `string` | UUID of the `public.approval_requests` record |

---

## Metadata Passed to Hosted & Programmatic Templates

### 1. `volunteer-schedule` (Hosted in Resend Dashboard)

- **Database Slug**: `volunteer-schedule`
- **Resend Template ID**: `volunteer-schedule`
- **Metadata Passed via Queue Payload**:
  ```json
  {
    "user_id": "0192d3f5-9b43-424a-9db2-1e9bf4d28d08",
    "first_name": "Juan",
    "service_times": "9:00 AM, 11:30 AM",
    "sunday_date": "2026-10-25",
    "sunday_label": "4th Sunday",
    "profile_url": "https://welcomehub.app/profile?tab=commitments",
    "target_url": "/profile?tab=commitments"
  }
  ```
- **Metadata Fields**:
  | Key | Type | Description |
  | :--- | :--- | :--- |
  | `first_name` | `string` | Volunteer first name (falls back to `"there"`) |
  | `service_times` | `string` | Comma-separated list of service times (e.g. `"9:00 AM, 11:30 AM"`) |
  | `sunday_date` | `string` | Date of the upcoming Sunday (`YYYY-MM-DD`) |
  | `sunday_label` | `string` | Human-readable Sunday position (e.g. `"4th Sunday"`) |
  | `profile_url` | `string` | Absolute link to volunteer commitment schedule |
  | `target_url` | `string` | Relative path (`/profile?tab=commitments`) |
  | `user_id` | `string` | UUID of the user in `public.users` |

---

### 2. `broadcast` (Broadcast Notification)

- **Database Slug**: `broadcast`
- **Resend Template ID**: `tmpl_broadcast_placeholder` _(or custom Resend ID)_
- **Metadata Passed via Queue Payload**:
  ```json
  {
    "broadcast_title": "Upcoming Ministry Gathering",
    "title": "Upcoming Ministry Gathering",
    "broadcast_message": "All ministry teams will gather this Saturday at 4 PM.",
    "message": "All ministry teams will gather this Saturday at 4 PM.",
    "broadcast_message_html": "All ministry teams will gather this Saturday at 4 PM.<br />",
    "message_html": "All ministry teams will gather this Saturday at 4 PM.<br />",
    "url": "https://welcomehub.app/events/ministry-gathering",
    "action_url": "https://welcomehub.app/events/ministry-gathering",
    "action_text": "View Event",
    "target_type": "role"
  }
  ```
- **Metadata Fields**:
  | Key | Type | Description |
  | :--- | :--- | :--- |
  | `broadcast_title` / `title` | `string` | Subject and card header title |
  | `broadcast_message` / `message` | `string` | Plain text broadcast message |
  | `broadcast_message_html` / `message_html` | `string` | HTML-formatted message with linkified URLs |
  | `action_url` / `url` | `string` | Destination URL for the CTA button |
  | `action_text` | `string` | Call-to-action button label (e.g. `"View Event"`, `"Open Form"`) |
  | `target_type` | `string` | Audience scope: `"all"`, `"role"`, `"user"`, or `"event"` |

---

### 3. `sunday-executive-debrief` (Sunday Executive Debrief)

- **Database Slug**: `sunday-executive-debrief`
- **Resend Template ID**: `tmpl_sunday_debrief_placeholder` _(or custom Resend ID)_
- **Metadata Passed via Queue Payload**:
  ```json
  {
    "broadcast_title": "Sunday Executive Debrief (2026-10-18)",
    "title": "Sunday Executive Debrief (2026-10-18)",
    "broadcast_message": "CCF Welcome Center — Sunday Executive Debrief...",
    "message": "CCF Welcome Center — Sunday Executive Debrief...",
    "url": "https://welcomehub.app/admin/services",
    "action_url": "https://welcomehub.app/admin/services",
    "action_text": "View in Services Dashboard",
    "target_type": "role",
    "sunday_date": "2026-10-18",
    "turnup_rate": "87%",
    "turnup_rate_num": 87,
    "peak_slot": "11:30 AM",
    "total_committed": 120,
    "total_present": 105,
    "total_walk_ins": 6,
    "summary": "Sunday services ran smoothly with solid turnup across all shifts.",
    "key_highlights": [
      "11:30 AM service achieved peak attendance with 45 volunteers present.",
      "6 walk-ins smoothly accommodated across Ushering teams."
    ],
    "key_highlights_html": "<ul style=\"margin: 0; padding-left: 20px; line-height: 1.5;\"><li style=\"margin-bottom: 6px; color: #334155;\">11:30 AM service achieved peak attendance with 45 volunteers present.</li><li style=\"margin-bottom: 6px; color: #334155;\">6 walk-ins smoothly accommodated across Ushering teams.</li></ul>",
    "highlights_html": "<ul style=\"margin: 0; padding-left: 20px; line-height: 1.5;\">...</ul>"
  }
  ```
- **Metadata Fields**:
  | Key | Type | Description |
  | :--- | :--- | :--- |
  | `sunday_date` | `string` | Service Sunday date (`YYYY-MM-DD`) |
  | `turnup_rate` / `turnup_rate_num` | `string` / `number` | Formatted percentage (`"87%"`) and numeric rate (`87`) |
  | `peak_slot` | `string` | Time slot with highest attendance (e.g. `"11:30 AM"`) |
  | `total_committed` | `number` | Count of scheduled volunteers committed for that Sunday |
  | `total_present` | `number` | Count of volunteers checked in / present |
  | `total_walk_ins` | `number` | Unscheduled volunteer walk-ins who attended |
  | `summary` | `string` | AI-generated executive summary |
  | `key_highlights` | `string[]` | Array of key analytical highlight bullets |
  | `key_highlights_html` | `string` | Formatted `<ul><li>...</li></ul>` HTML list for direct injection |
  | `action_url` | `string` | Link to the Admin Services Dashboard |

---

## Template Design & Compatibility

Each template in this directory is built to ensure maximum compatibility across major email clients (Gmail, Apple Mail, Outlook desktop & web, iOS Mail, Samsung Mail):

- **Table-Based Layout**: Fluid-width containers bounded by max-width tables (`600px`).
- **Hidden Preheaders**: Zero-height, hidden preheader text snippet (`data-skip-in-text="true"`) to control the inbox preview snippet before opening.
- **Dynamic Placeholders**: Triple-brace mustache syntax (`{{{variable}}}`) allowing unescaped interpolation when injected via Resend variables.
- **Call-to-Action (CTA) Buttons**: Bulletproof table-cell CTA buttons with explicit padding and text colors.
- **Dark Mode Support**: Minimalist palette respecting system high-contrast and dark mode client styling.

---

## How to Sync with Resend

1. **Create Template in Resend**:
   - Go to [Resend Templates](https://resend.com/templates).
   - Click **Create Template**.
   - Copy the HTML source from the template file (e.g. `approval-review-request.html`) and paste it into the Resend editor.
   - Save the template and copy its generated Template ID (e.g. `tmpl_abc123...`).

2. **Register Template in Welcome Hub**:
   - Navigate to `/admin/settings/email-templates` in the Welcome Hub Admin panel.
   - Locate the matching template slug (e.g. `approval-review-request`).
   - Paste the Resend Template ID into the **Resend Template ID** field and save.

3. **Fallback Behavior**:
   - If the template ID is unconfigured or set to a placeholder (`tmpl_*_placeholder`), the Edge Function worker automatically falls back to programmatic inlined HTML builders located in `supabase/functions/_shared/emailTemplates/` and `_shared/emailTemplate.ts`.

---

## Architectural & Delivery Documentation

For the full architectural guide on queue processing, scheduled crons, and notification inventories, see:

- [`docs/guides/email-notifications-and-templates.md`](../docs/guides/email-notifications-and-templates.md)
