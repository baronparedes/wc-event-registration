# Specific Domain Logic

**Context:** This skill records architectural facts and business rules about core entities.

**Instructions:**

- **Hub Layout (`src/pages/home`):** Open events and active forms are displayed together in mixed sections via `HubSection`. They are distinguished by title icons (`Calendar` for events, `FileText` for forms). Past events are rendered as a compact `PastEventList` to conserve UI space.
- **Event Registration Auto-Lookup:** For signed-in members, event registration automatically looks up session credentials and skips to Step 3. You must display a dedicated verification loading card during this phase so the Step 1 form does not flash on screen.
- **Forms Entity:** Non-event data gathering uses `forms`, `form_fields`, `form_submissions`, and `form_submission_answers`. Forms support dynamic fields, duplicate policies, and audience rules (`members`, `public`, `members_and_public`).
- **Service Attendance Domain:** Service attendance and seat layouts (`service_attendance`, `service_layouts`, `service_seats`) are completely isolated from standard Events. In this domain, RFID tags correspond to `users.member_id`.
