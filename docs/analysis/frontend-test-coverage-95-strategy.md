# Frontend Test Coverage to 95%

## Target and baseline

- Target: at least 95% **statements and lines** across the existing Vitest frontend coverage scope. Track branches and functions, but do not raise their thresholds as part of this effort.
- Scope requested: all frontend source, including components, pages, hooks, and domain/infrastructure modules. Before claiming this target for _all_ frontend source, reconcile the existing exclusions in `vitest.config.ts` (notably `src/App.tsx`, `src/config/**`, and `*types.ts`). Keep deliberate exclusions for tests, generated assets, and non-executable files; any change in scope requires a new baseline.
- Baseline after the latest test batch (2026-09-29): 11,216 / 11,909 statements (94.18%); 10,602 / 11,143 lines (95.14%). With this denominator, 98 more covered statements are required; the line target is met. New source code or scope changes will change those numbers.
- No 95% CI gate yet. Report progress during each batch and decide on enforcement only after coverage reaches the target consistently.

## Test order

Prioritize by uncovered **statement count**, then by risk and ability to assert observable behavior. Counts below are from the baseline above; refresh them after every batch.

| Area                                                                                           | Uncovered statements | Behavior to test next                                             |
| ---------------------------------------------------------------------------------------------- | -------------------: | ----------------------------------------------------------------- |
| `src/lib/domain/services/api.ts`                                                               |                   21 | Service queries, RPC failures, and pagination.                    |
| `src/pages/admin/services/attendance/migration/components/ServiceAttendanceMigrationPanel.tsx` |                   17 | Excel uploads and remaining reachable import paths.               |
| `src/pages/events/[slug]/register/hooks/useEventRegistrationPageState.ts`                      |                   17 | ID-first registration state transitions and invalid inputs.       |
| `src/hooks/domain/attendance/mutations/useQueuedCheckInAttendeeMutation.ts`                    |                   15 | Offline retry and failed check-in handling.                       |
| `src/pages/admin/members/[id]/index.tsx`                                                       |                   13 | Member profile update and avatar mutation outcomes.               |
| `src/pages/admin/chat/index.tsx`                                                               |                   12 | Chat page loading and request outcomes.                           |
| Remaining pages, hooks, and utilities                                                          | 10 or fewer per file | Cover actionable user flows and errors from the refreshed report. |

These top six files account for 95 uncovered statements; they cannot by themselves guarantee the 98-statement target. Continue down the refreshed ranked list after each batch. Recent batches added notification push, attendance snapshots, calendar data, service attendance, chat, and dashboard tests. An attendance nickname search bug surfaced during testing and was fixed locally.

## Execution loop

1. Add behavior-focused cases to neighboring test files using existing React Testing Library/Vitest patterns and test factories. Assert rendered state, calls, or user outcomes, not implementation details or snapshots alone.
2. Run `npm run test:agent -- <test-path>` for the touched suite. Fix any failure before broadening the batch.
3. Run `npm run test:coverage` at the end of each batch. Rank remaining files by `statements.total - statements.covered` in `coverage/coverage-summary.json`; keep a record of both target metrics and the gap to 95%.
4. Run `npm run build:agent` for TypeScript validation. Do not change production coverage exclusions merely to improve the percentage, and do not run `ci:gate` for these incremental batches.
5. Once both metrics exceed 95% on a clean full run, rerun the coverage suite to check stability, then decide whether to add a dedicated frontend coverage gate. The existing global thresholds remain 90% statements/lines/functions and 85% branches until that decision.

Coverage is a guide to missed behavior, not a substitute for testing high-risk flows: registration, auth, attendance, and public writes deserve tests even when a small utility yields easier percentage gains.
