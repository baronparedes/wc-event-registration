import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAdminRolesQuery,
  useAssignAdminRoleMutation,
  useAuthUsersQuery,
  useRevokeAdminRoleMutation,
  useUpdateAdminRoleMutation,
} from '@/hooks/domain/auth';
import { supabase } from '@/lib/infrastructure';

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('role management domain hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAdminRolesQuery', () => {
    it('fetches admin roles successfully', async () => {
      const mockRoles = [
        {
          id: '1',
          auth_user_id: 'u1',
          email: 'a@example.com',
          role: 'admin',
          created_at: '2026-01-01',
        },
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockRoles, error: null } as never);

      const { result } = renderHook(() => useAdminRolesQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockRoles);
      expect(supabase.rpc).toHaveBeenCalledWith('get_admin_roles');
    });

    it('handles RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('RPC error'),
      } as never);

      const { result } = renderHook(() => useAdminRolesQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('RPC error');
    });
  });

  describe('useAuthUsersQuery', () => {
    it('lists auth users with search term', async () => {
      const mockUsers = [
        { id: 'u1', email: 'test@example.com', created_at: '2026-01-01', last_sign_in_at: null },
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockUsers, error: null } as never);

      const { result } = renderHook(() => useAuthUsersQuery('test'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockUsers);
      expect(supabase.rpc).toHaveBeenCalledWith('list_auth_users', { p_search: 'test' });
    });

    it('handles empty search term by passing null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as never);

      const { result } = renderHook(() => useAuthUsersQuery('   '), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(supabase.rpc).toHaveBeenCalledWith('list_auth_users', { p_search: null });
    });

    it('handles search error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Search failed'),
      } as never);

      const { result } = renderHook(() => useAuthUsersQuery('test'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useAssignAdminRoleMutation', () => {
    it('assigns role successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({ data: { id: '1' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValueOnce({ upsert: mockUpsert } as never);

      const { result } = renderHook(() => useAssignAdminRoleMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({ authUserId: 'u1', role: 'admin' });

      expect(supabase.from).toHaveBeenCalledWith('admins');
      expect(mockUpsert).toHaveBeenCalledWith(
        { auth_user_id: 'u1', role: 'admin' },
        { onConflict: 'auth_user_id' },
      );
    });

    it('throws error when assign fails', async () => {
      const mockSingle = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: new Error('Assign failed') });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValueOnce({ upsert: mockUpsert } as never);

      const { result } = renderHook(() => useAssignAdminRoleMutation(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync({ authUserId: 'u1', role: 'admin' })).rejects.toThrow(
        'Assign failed',
      );
    });
  });

  describe('useUpdateAdminRoleMutation', () => {
    it('updates role successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({ data: { id: '1' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValueOnce({ update: mockUpdate } as never);

      const { result } = renderHook(() => useUpdateAdminRoleMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({ adminId: '1', role: 'slod' });

      expect(supabase.from).toHaveBeenCalledWith('admins');
      expect(mockUpdate).toHaveBeenCalledWith({ role: 'slod' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('throws error when update fails', async () => {
      const mockSingle = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: new Error('Update failed') });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValueOnce({ update: mockUpdate } as never);

      const { result } = renderHook(() => useUpdateAdminRoleMutation(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync({ adminId: '1', role: 'slod' })).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('useRevokeAdminRoleMutation', () => {
    it('revokes role successfully', async () => {
      const mockEq = vi.fn().mockResolvedValueOnce({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValueOnce({ delete: mockDelete } as never);

      const { result } = renderHook(() => useRevokeAdminRoleMutation(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({ adminId: '1' });

      expect(supabase.from).toHaveBeenCalledWith('admins');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('throws error when revoke fails', async () => {
      const mockEq = vi.fn().mockResolvedValueOnce({ error: new Error('Revoke failed') });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValueOnce({ delete: mockDelete } as never);

      const { result } = renderHook(() => useRevokeAdminRoleMutation(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync({ adminId: '1' })).rejects.toThrow('Revoke failed');
    });
  });
});
