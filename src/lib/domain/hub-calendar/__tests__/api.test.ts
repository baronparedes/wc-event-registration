import { describe, expect, it, vi } from 'vitest';

import type { RecommendStandInPayload, RecommendStandInResponse } from '../api';
import { recommendStandIn } from '../api';

const { mockCallRecommendStandIn } = vi.hoisted(() => ({
  mockCallRecommendStandIn: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  createEdgeFunctionCaller: () => mockCallRecommendStandIn,
}));

describe('hub-calendar api', () => {
  const payload: RecommendStandInPayload = {
    targetDate: '2026-11-01',
    timeSlot: '9AM',
    role: 'Usher',
    candidates: [
      {
        token: 'USR_001',
        turnupRate: 90,
        attendanceScore: 8.5,
        tier: 'solid',
      },
    ],
  };

  const mockResponse: RecommendStandInResponse = {
    recommendations: [
      {
        candidateToken: 'USR_001',
        rank: 1,
        reasoning: 'High reliability and slot alignment.',
      },
    ],
    invitations: {
      sms: 'Hi, can you serve?',
      viber: 'Hi, can you serve on Sunday?',
      email: {
        subject: 'Usher Needed',
        body: 'Please let us know if you can serve.',
      },
    },
  };

  it('returns response data on successful edge function call', async () => {
    mockCallRecommendStandIn.mockResolvedValueOnce({
      success: true,
      data: mockResponse,
    });

    const result = await recommendStandIn(payload);
    expect(result).toEqual(mockResponse);
    expect(mockCallRecommendStandIn).toHaveBeenCalledWith(payload);
  });

  it('throws an error if the edge function returns null or undefined', async () => {
    mockCallRecommendStandIn.mockResolvedValueOnce(null);

    await expect(recommendStandIn(payload)).rejects.toThrow(
      'Failed to generate stand-in recommendation',
    );
  });

  it('throws an error if success is false', async () => {
    mockCallRecommendStandIn.mockResolvedValueOnce({
      success: false,
      data: null,
    });

    await expect(recommendStandIn(payload)).rejects.toThrow(
      'Failed to generate stand-in recommendation',
    );
  });

  it('throws an error if data is missing', async () => {
    mockCallRecommendStandIn.mockResolvedValueOnce({
      success: true,
      data: null,
    });

    await expect(recommendStandIn(payload)).rejects.toThrow(
      'Failed to generate stand-in recommendation',
    );
  });
});
