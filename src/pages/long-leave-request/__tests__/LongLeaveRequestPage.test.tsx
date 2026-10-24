/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/unit-test-utils';
import { useSlodUsersQuery } from '@/hooks/domain/approvals';
import { useCurrentProfileQuery } from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';

import { LongLeaveRequestPage } from '../index';

vi.mock('@/hooks/domain/members', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useCurrentProfileQuery: vi.fn(),
  };
});

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/approvals', () => ({
  useSlodUsersQuery: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LongLeaveRequestPage Wizard', () => {
  const mockMutateSubmit = vi.fn();
  const mockUseCurrentProfileQuery = vi.mocked(useCurrentProfileQuery);
  const mockUseSubmitExcuseMutation = vi.mocked(useSubmitExcuseMutation);
  const mockUseSlodUsersQuery = vi.mocked(useSlodUsersQuery);

  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    mockUseCurrentProfileQuery.mockReturnValue({ data: null, isLoading: false } as any);
    mockUseSlodUsersQuery.mockReturnValue({ data: [], isLoading: false } as any);
    mockUseSubmitExcuseMutation.mockReturnValue({
      mutateAsync: mockMutateSubmit,
      isPending: false,
    } as any);
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LongLeaveRequestPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('renders Step 1 method selector when user is not signed in', () => {
    renderPage();
    expect(screen.getByText('Volunteer Long Leave Request')).toBeInTheDocument();
    expect(screen.getByText('Identify')).toBeInTheDocument();
  });
});
