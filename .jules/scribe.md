## 2026-10-15 - Document Missed Commitments Feature

**Discovery:** The Missed Commitments tracking feature (added in PR #336) lacked its own feature documentation in the Gherkin files.
**Learning:** New admin services features were added under `src/pages/admin/services` but an epic directory `docs/features/10-admin-services` was missing.
**Standard:** When adding new top-level admin capabilities, ensure corresponding numbered epic folders are created (e.g. `10-admin-services`) and that their features are represented in Gherkin business logic.

## 2024-10-16 - Admin Forms Documentation

**Discovery:** The entire `src/pages/admin/forms` component hierarchy lacks corresponding documentation in `docs/features/`.
**Learning:** This is a major admin feature that allows configuring custom data collection via dynamic forms, fields, and viewing their submissions.
**Standard:** Documented under the new `11-admin-forms` directory, separating view list, create/edit, fields configuration, and submissions into distinct `.feature` files.

## 2024-10-19 - Excuse Request Form

**Discovery:** Found that the new excuse request form page logic and components were undocumented.
**Learning:** This is a newly added feature which requires appropriate Gherkin scenario representation because it uses a step wizard process (similar to registration but for a different domain).
**Standard:** Documented under a new `14-excuse-request` category within `docs/features/`.

## 2026-10-20 - Unified Approval Workflow

**Discovery:** Found that the unified approval workflow module at `src/pages/approvals` and `src/lib/domain/approvals` had no feature documentation.
**Learning:** This is an important system for allowing unauthenticated users to submit approval decisions via secure tokens.
**Standard:** Documented under a new `15-approvals` category within `docs/features/`.

## 2026-10-21 - Document Sunday Attendance Forecast Feature

**Discovery:** The Sunday Attendance Forecast feature (located at `src/pages/admin/services/attendance/forecast`) was completely undocumented in the feature specs.
**Learning:** This is a major admin tool for tracking expected volunteer turnup, viewing monthly trends, configuring staffing targets, and sharing forecast cards. It belongs under the `10-admin-services` epic since it is a core administrative dashboard.
**Standard:** Documented under `docs/features/10-admin-services/10.2-attendance-forecast.feature` following standard Gherkin syntax. Included scenarios for viewing monthly summaries, filtering by role group, toggling chart/table views, configuring targets, and sharing forecasts.

## 2026-10-31 - Document Admin Settings Features

**Discovery:** Found that the admin settings section, specifically the user roles management component located at `src/pages/admin/settings/roles/index.tsx`, lacked feature documentation in the Gherkin files.
**Learning:** System-wide settings and role administration are core features that require their own distinct epic category to properly distinguish them from standard domain entities (like members or events).
**Standard:** Documented under a new `19-admin-settings` epic folder in `docs/features/`. Going forward, all broad application settings, administrative configurations, and role management features should reside in this category to maintain a clear separation from operational domain features.
