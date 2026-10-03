import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMembersLoginCounts } from '@/lib/domain/members/api';
import { supabase } from '@/lib/infrastructure';

vi.mock('@/lib/infrastructure', () => {
  const selectMock = vi.fn();
  const gteMock = vi.fn();
  const eqMock = vi.fn();

  selectMock.mockReturnValue({ gte: gteMock });
  gteMock.mockReturnValue({ eq: eqMock });

  return {
    supabase: {
      from: vi.fn(() => ({
        select: selectMock,
      })),
      _mocks: {
        selectMock,
        gteMock,
        eqMock,
      },
    },
  };
});

describe('fetchMembersLoginCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates login counts by user_id for non-walk-in attendance', async () => {
    const mockMocks = (
      supabase as unknown as {
        _mocks: {
          selectMock: ReturnType<typeof vi.fn>;
          gteMock: ReturnType<typeof vi.fn>;
          eqMock: ReturnType<typeof vi.fn>;
        };
      }
    )._mocks;

    mockMocks.selectMock.mockReturnValue({ gte: mockMocks.gteMock });
    mockMocks.gteMock.mockReturnValue({ eq: mockMocks.eqMock });
    mockMocks.eqMock.mockResolvedValueOnce({
      data: [
        { user_id: 'user-1' },
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: null },
      ],
      error: null,
    });

    const result = await fetchMembersLoginCounts(12);

    expect(supabase.from).toHaveBeenCalledWith('service_attendance');
    expect(mockMocks.selectMock).toHaveBeenCalledWith('user_id');
    expect(mockMocks.eqMock).toHaveBeenCalledWith('is_walk_in', false);

    expect(result.get('user-1')).toBe(2);
    expect(result.get('user-2')).toBe(1);
    expect(result.has('user-3')).toBe(false);
  });

  it('throws error when database query fails', async () => {
    const mockMocks = (
      supabase as unknown as {
        _mocks: {
          selectMock: ReturnType<typeof vi.fn>;
          gteMock: ReturnType<typeof vi.fn>;
          eqMock: ReturnType<typeof vi.fn>;
        };
      }
    )._mocks;

    mockMocks.selectMock.mockReturnValue({ gte: mockMocks.gteMock });
    mockMocks.gteMock.mockReturnValue({ eq: mockMocks.eqMock });
    mockMocks.eqMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await expect(fetchMembersLoginCounts(12)).rejects.toThrow(
      'Failed to fetch login counts: Database connection failed',
    );
  });
});
