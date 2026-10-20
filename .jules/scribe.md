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
