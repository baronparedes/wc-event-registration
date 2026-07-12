import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import {
  useBulkUpsertAttendanceAnswersMutation,
  useDownloadAttendanceCSVMutation,
  useExportAttendanceCSVMutation,
} from '@/hooks/domain/attendance';

const {
  mockTextCaller,
  mockCreateEdgeFunctionTextCaller,
  mockJsonCaller,
  mockCreateEdgeFunctionCaller,
} = vi.hoisted(() => {
  const textCaller = vi.fn();
  const jsonCaller = vi.fn();

  return {
    mockTextCaller: textCaller,
    mockCreateEdgeFunctionTextCaller: vi.fn(() => textCaller),
    mockJsonCaller: jsonCaller,
    mockCreateEdgeFunctionCaller: vi.fn(() => jsonCaller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionTextCaller: mockCreateEdgeFunctionTextCaller,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('attendance bulk csv mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads attendance csv template', async () => {
    const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mockTextCaller.mockResolvedValueOnce({ text: 'csv,data', filename: 'attendance.csv' });

    const { result } = renderHookWithClient(() => useDownloadAttendanceCSVMutation(eventId));

    const response = await act(async () => result.current.mutateAsync());

    expect(mockCreateEdgeFunctionTextCaller).toHaveBeenCalledWith('download-attendance-csv');
    expect(mockTextCaller).toHaveBeenCalledWith({ event_id: eventId });
    expect(response).toEqual({ text: 'csv,data', filename: 'attendance.csv' });
  });

  it('exports attendance csv from dedicated export edge function', async () => {
    const eventId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    mockTextCaller.mockResolvedValueOnce({ text: 'csv,data', filename: 'attendance-export.csv' });

    const { result } = renderHookWithClient(() => useExportAttendanceCSVMutation(eventId));

    const response = await act(async () => result.current.mutateAsync());

    expect(mockCreateEdgeFunctionTextCaller).toHaveBeenCalledWith('export-attendance-csv');
    expect(mockTextCaller).toHaveBeenCalledWith({ event_id: eventId });
    expect(response).toEqual({ text: 'csv,data', filename: 'attendance-export.csv' });
  });

  it('bulk upserts attendance rows and invalidates attendance answers cache', async () => {
    const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    mockJsonCaller.mockResolvedValueOnce({ success: true, imported_count: 2 });

    const { result, queryClient } = renderHookWithClient(() =>
      useBulkUpsertAttendanceAnswersMutation(),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      event_id: eventId,
      rows: [
        {
          attendee_kind: 'registered' as const,
          registration_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          answers: { table_number: 5 },
        },
      ],
    };

    const response = await act(async () => result.current.mutateAsync(payload));

    expect(mockCreateEdgeFunctionCaller).toHaveBeenCalledWith('bulk-upsert-attendance-answers');
    expect(mockJsonCaller).toHaveBeenCalledWith(payload);
    expect(response.success).toBe(true);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceAnswers(eventId),
      });
    });
  });
});
