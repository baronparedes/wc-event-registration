1. **Understand the Testing Gap**: The component `LongLeaveRequestPage` and its state hook `useLongLeaveRequestPageState` are currently lacking tests.
2. **Setup Mock Environment**:
   - Mock `@tanstack/react-query`, `react-router-dom`, `sonner`, `@/hooks/domain/members`, and `@/hooks/domain/services` to isolate the page logic.
   - Use React Testing Library (`@testing-library/react` and `@testing-library/user-event`).
3. **Implement Tests for `LongLeaveRequestPage`**:
   - Create tests ensuring the correct rendering of the initial state (Step 1: Lookup).
   - Test transitions between steps (Lookup -> Confirm Profile -> Leave Details -> Confirmation).
   - Validate form submissions, handling of `isVerifyingSignedInMember`, and successful/failure responses from `useSubmitExcuseMutation`.
4. **Implement Tests for `useLongLeaveRequestPageState` Hook**:
   - Create a separate test file `src/pages/long-leave-request/hooks/__tests__/useLongLeaveRequestPageState.test.ts`.
   - Test the initial hook state.
   - Test step transitions correctly update state.
   - Test form validation schema `longLeaveFormSchema` ensuring start/end date format and 28-day gap.
5. **Run Pre-Commit Checks**:
   - Run linter and tests to ensure no regressions are introduced.
6. **Submit Code**: Submit a pull request titled "🧪 TestGuard: Add unit tests for LongLeaveRequestPage".
