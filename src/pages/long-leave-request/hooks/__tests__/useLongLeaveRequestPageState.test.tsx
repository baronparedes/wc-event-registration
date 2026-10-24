import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useLongLeaveRequestPageState } from '../useLongLeaveRequestPageState';

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: vi.fn().mockReturnValue({ data: null, isLoading: false }),
  useMemberLookupState: vi.fn().mockReturnValue({
    matchedMember: null,
    isRegistrationBlocked: false,
    memberIdHighlight: false,
    reset: vi.fn(),
    lookupForm: { control: {}, formState: { errors: {} }, register: vi.fn() },
    isLookupPending: false,
    handleLookupSubmit: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: vi.fn().mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('useLongLeaveRequestPageState', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });
    expect(result.current.activeWizardStep).toBe(1);
    expect(result.current.isSubmissionConfirmed).toBe(false);
  });
});
