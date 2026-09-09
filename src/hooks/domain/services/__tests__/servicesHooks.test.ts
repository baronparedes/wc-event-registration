import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  useActiveServiceLayoutQuery,
  useCreateServiceLayoutMutation,
  useCreateServiceSeatMutation,
  useDeleteServiceAttendanceMutation,
  useDeleteServiceSeatMutation,
  useRecordServiceAttendanceMutation,
  useServiceAttendanceQuery,
  useServiceLayoutsQuery,
  useServiceSeatsQuery,
  useUpdateServiceAttendanceMutation,
  useUpdateServiceLayoutMutation,
  useUpdateServiceSeatMutation,
} from '@/hooks/domain/services';

vi.mock('@/config/env', () => ({
  env: {
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'test-key',
  },
}));

const { mockFrom } = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  };
});

describe('Services Domain Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queries', () => {
    it('useServiceLayoutsQuery fetches service layouts', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'layout-1', description: 'Layout 1' }],
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useServiceLayoutsQuery());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([{ id: 'layout-1', description: 'Layout 1' }]);
      expect(mockFrom).toHaveBeenCalledWith('service_layouts');
    });

    it('useActiveServiceLayoutQuery fetches active service layout', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'layout-active', description: 'Active Layout' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useActiveServiceLayoutQuery());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'layout-active', description: 'Active Layout' });
      expect(mockFrom).toHaveBeenCalledWith('service_layouts');
    });

    it('useServiceSeatsQuery fetches seats for layoutId', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'seat-1', table_number: 'Table 1' }],
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useServiceSeatsQuery('layout-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([{ id: 'seat-1', table_number: 'Table 1' }]);
      expect(mockFrom).toHaveBeenCalledWith('service_seats');
    });

    it('useServiceAttendanceQuery fetches service attendance records', async () => {
      const mockResult = {
        data: [{ id: 'att-1', time_slot: '9AM' }],
        error: null,
      };
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi
          .fn()
          .mockImplementation((onFulfilled) => Promise.resolve(mockResult).then(onFulfilled)),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() =>
        useServiceAttendanceQuery({ service_date: '2025-03-09', time_slot: '9AM' }),
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([{ id: 'att-1', time_slot: '9AM' }]);
      expect(mockFrom).toHaveBeenCalledWith('service_attendance');
    });
  });

  describe('Mutations', () => {
    it('useCreateServiceLayoutMutation creates a service layout', async () => {
      const mockBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'layout-created', description: 'New Layout' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useCreateServiceLayoutMutation());

      result.current.mutate({ description: 'New Layout' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'layout-created', description: 'New Layout' });
    });

    it('useUpdateServiceLayoutMutation updates a service layout', async () => {
      const mockBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'layout-1', description: 'Updated' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useUpdateServiceLayoutMutation());

      result.current.mutate({ id: 'layout-1', input: { description: 'Updated' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'layout-1', description: 'Updated' });
    });

    it('useCreateServiceSeatMutation creates a service seat', async () => {
      const mockBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'seat-1', table_number: 'Table 1' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useCreateServiceSeatMutation());

      result.current.mutate({
        layout_id: '123e4567-e89b-12d3-a456-426614174000',
        table_number: 'Table 1',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'seat-1', table_number: 'Table 1' });
    });

    it('useUpdateServiceSeatMutation updates a service seat', async () => {
      const mockBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'seat-1', table_number: 'Table 2' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useUpdateServiceSeatMutation());

      result.current.mutate({ id: 'seat-1', input: { table_number: 'Table 2' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'seat-1', table_number: 'Table 2' });
    });

    it('useDeleteServiceSeatMutation deletes a service seat', async () => {
      const mockBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useDeleteServiceSeatMutation());

      result.current.mutate('seat-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useRecordServiceAttendanceMutation records attendance', async () => {
      const mockBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'att-1', time_slot: '9AM' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useRecordServiceAttendanceMutation());

      result.current.mutate({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        service_date: '2025-03-09',
        time_slot: '9AM',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'att-1', time_slot: '9AM' });
    });

    it('useUpdateServiceAttendanceMutation updates attendance record', async () => {
      const mockBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'att-1', is_override: true },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useUpdateServiceAttendanceMutation());

      result.current.mutate({ id: 'att-1', input: { is_override: true } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ id: 'att-1', is_override: true });
    });

    it('useDeleteServiceAttendanceMutation deletes attendance record', async () => {
      const mockBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockBuilder);

      const { result } = renderHookWithClient(() => useDeleteServiceAttendanceMutation());

      result.current.mutate('att-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
