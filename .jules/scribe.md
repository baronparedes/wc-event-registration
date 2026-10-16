## 2026-10-15 - Document Missed Commitments Feature

**Discovery:** The Missed Commitments tracking feature (added in PR #336) lacked its own feature documentation in the Gherkin files.
**Learning:** New admin services features were added under `src/pages/admin/services` but an epic directory `docs/features/10-admin-services` was missing.
**Standard:** When adding new top-level admin capabilities, ensure corresponding numbered epic folders are created (e.g. `10-admin-services`) and that their features are represented in Gherkin business logic.
## 2024-10-16 - Admin Forms Documentation
**Discovery:** The entire `src/pages/admin/forms` component hierarchy lacks corresponding documentation in `docs/features/`.
**Learning:** This is a major admin feature that allows configuring custom data collection via dynamic forms, fields, and viewing their submissions.
**Standard:** Documented under the new `11-admin-forms` directory, separating view list, create/edit, fields configuration, and submissions into distinct `.feature` files.
