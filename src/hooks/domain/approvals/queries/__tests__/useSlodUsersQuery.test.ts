import { ReactNode, createElement } from 'react';

import { faker } from '@faker-js/faker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SlodUserItem, fetchSlodUsers } from '@/lib/domain/approvals';

import { useSlodUsersQuery } from '../useSlodUsersQuery';

vi.mock('@/lib/domain/approvals', () => ({
  fetchSlodUsers: vi.fn(),
}));

const mockSlodUsers: SlodUserItem[] = [
  { id: 'user-1', full_name: faker.person.fullName(), email: faker.internet.email() },
  { id: 'user-2', full_name: faker.person.fullName(), email: faker.internet.email() },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ['/'] }, children),
    );
  };
}

describe('useSlodUsersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches slod users successfully', async () => {
    vi.mocked(fetchSlodUsers).mockResolvedValue(mockSlodUsers);

    const { result } = renderHook(() => useSlodUsersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSlodUsers);
    expect(fetchSlodUsers).toHaveBeenCalledTimes(1);
  });

  it('respects enabled option', () => {
    const { result } = renderHook(() => useSlodUsersQuery({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchSlodUsers).not.toHaveBeenCalled();
  });

  it('handles error state properly', async () => {
    const error = new Error('Failed to fetch slod users');
    vi.mocked(fetchSlodUsers).mockRejectedValue(error);

    const { result } = renderHook(() => useSlodUsersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});
