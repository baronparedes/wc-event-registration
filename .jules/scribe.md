## 2026-10-15 - Document Missed Commitments Feature

**Discovery:** The Missed Commitments tracking feature (added in PR #336) lacked its own feature documentation in the Gherkin files.
**Learning:** New admin services features were added under `src/pages/admin/services` but an epic directory `docs/features/10-admin-services` was missing.
**Standard:** When adding new top-level admin capabilities, ensure corresponding numbered epic folders are created (e.g. `10-admin-services`) and that their features are represented in Gherkin business logic.
