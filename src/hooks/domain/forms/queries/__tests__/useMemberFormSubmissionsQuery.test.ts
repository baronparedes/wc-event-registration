import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { fetchMemberFormSubmissions } from '@/lib/domain/forms';

import { useMemberFormSubmissionsQuery } from '../useMemberFormSubmissionsQuery';

vi.mock('@/lib/domain/forms', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/forms')>('@/lib/domain/forms');
  return {
    ...actual,
    fetchMemberFormSubmissions: vi.fn(),
  };
});

describe('useMemberFormSubmissionsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns parsed member form submissions', async () => {
    const mockData = [
      {
        submission_id: 'sub-1',
        form_id: 'form-1',
        form_title: 'Volunteer Application',
        form_slug: 'volunteer-application',
        form_description: 'Join our team',
        status: 'pending_approval',
        submitted_at: '2026-10-24T00:00:00Z',
        updated_at: '2026-10-24T00:00:00Z',
        answers: [
          {
            id: 'ans-1',
            form_field_id: 'field-1',
            field_key: 'experience',
            label: 'Experience',
            field_type: 'text',
            answer_text: '5 years',
            answer_number: null,
          },
        ],
        approval_requests: [
          {
            id: 'req-1',
            status: 'pending',
            assigned_to_email: 'lead@example.com',
            decided_by_email: null,
            decided_at: null,
            decision_notes: null,
            field_label: 'Lead Approval',
            field_key: 'lead_approval',
          },
        ],
      },
    ];

    vi.mocked(fetchMemberFormSubmissions).mockResolvedValueOnce(mockData as never);

    const { result } = renderHookWithClient(() => useMemberFormSubmissionsQuery('user-123'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMemberFormSubmissions).toHaveBeenCalledWith('user-123');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].form_title).toBe('Volunteer Application');
    expect(result.current.data?.[0].status).toBe('pending_approval');
    expect(result.current.data?.[0].approval_requests).toHaveLength(1);
    expect(result.current.data?.[0].approval_requests[0].field_label).toBe('Lead Approval');
  });

  it('remains disabled when userId is undefined', () => {
    const { result } = renderHookWithClient(() => useMemberFormSubmissionsQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMemberFormSubmissions).not.toHaveBeenCalled();
  });
});
