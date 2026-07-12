import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useRegistrationNamesQuery } from '@/hooks/domain/registrations/queries/useRegistrationNamesQuery';

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useRegistrationNamesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed registration names payload from export edge function', async () => {
    const eventId = faker.string.uuid();
    const eventTitle = faker.lorem.words(2);

    mockCaller.mockResolvedValueOnce({
      success: true,
      event_title: eventTitle,
      row_count: 1,
      answer_fields: [{ field_id: 'field-1', label: 'Team' }],
      rows: [
        {
          full_name: faker.person.fullName(),
          member_id: `WC-${faker.string.numeric(3)}`,
          email: faker.internet.email(),
          phone: faker.phone.number(),
          metadata: 'team: Alpha; first_sunday: true',
          role: 'Member',
          category: 'Adult',
          registration_status: 'submitted',
          submitted_at: faker.date.past().toISOString(),
          updated_at: '',
          answer_values: { 'field-1': faker.company.name() },
        },
      ],
    });

    const { result } = renderHookWithClient(() => useRegistrationNamesQuery(eventId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.event_title).toBe(eventTitle);
    expect(mockCaller).toHaveBeenCalledWith({ event_id: eventId, response_mode: 'names_json' });
  });

  it('returns query error state when response parsing fails', async () => {
    mockCaller.mockResolvedValueOnce({});

    const { result } = renderHookWithClient(() => useRegistrationNamesQuery(faker.string.uuid()));

    await act(async () => {
      const refetchResult = await result.current.refetch();
      expect(refetchResult.isError).toBe(true);
    });
  });

  it('does not run when explicitly disabled', () => {
    renderHookWithClient(() => useRegistrationNamesQuery(faker.string.uuid(), { enabled: false }));

    expect(mockCaller).not.toHaveBeenCalled();
  });
});
