import { describe, expect, it, vi } from 'vitest';

import { generateEntityBlueprint } from '../api';

const { mockEdgeFunctionCaller } = vi.hoisted(() => ({
  mockEdgeFunctionCaller: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  createEdgeFunctionCaller: () => mockEdgeFunctionCaller,
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-user-123' } },
      }),
    },
    from: vi.fn(),
  },
}));

describe('ai-generator api', () => {
  it('calls edge function and returns valid blueprint', async () => {
    const mockResponse = {
      domain: 'event' as const,
      metadata: {
        title: 'Couples Fellowship',
        slug: 'couples-fellowship',
        description: 'Couples event',
        location: 'Hall A',
        audience: 'members_and_public' as const,
        duplicate_policy: 'block' as const,
      },
      fields: [
        {
          field_key: 'spouse_name',
          label: 'Spouse Name',
          field_type: 'text' as const,
          is_required: true,
          options: [],
          validation_rules: {},
        },
      ],
    };

    mockEdgeFunctionCaller.mockResolvedValueOnce(mockResponse);

    const result = await generateEntityBlueprint({
      domain: 'event',
      prompt: 'Couples event with spouse name',
    });

    expect(result.metadata.title).toBe('Couples Fellowship');
    expect(result.fields).toHaveLength(1);
  });

  it('throws when edge function returns invalid payload', async () => {
    mockEdgeFunctionCaller.mockResolvedValueOnce(null);

    await expect(
      generateEntityBlueprint({
        domain: 'event',
        prompt: 'test prompt',
      }),
    ).rejects.toThrow('Invalid blueprint response from AI generation service');
  });
});
