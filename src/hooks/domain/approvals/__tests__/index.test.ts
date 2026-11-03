import { describe, expect, it } from 'vitest';

import * as exports from '../index';

describe('approvals index', () => {
  it('exports expected query hooks', () => {
    expect(exports.useApprovalRequestsQuery).toBeDefined();
    expect(exports.useApprovalReviewQuery).toBeDefined();
    expect(exports.useSlodUsersQuery).toBeDefined();
  });

  it('exports expected mutation hooks', () => {
    expect(exports.useDelegateApprovalMutation).toBeDefined();
    expect(exports.useSubmitApprovalDecisionMutation).toBeDefined();
  });
});
