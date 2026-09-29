import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/lib/infrastructure';

import {
  enqueueEventNotification,
  fetchEmailTemplateById,
  fetchEmailTemplates,
  saveEmailTemplate,
} from '../api';

const { mockEnqueueCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const enqueueCaller = vi.fn();
  const createCaller = vi.fn((fnName: string) => {
    if (fnName === 'enqueue-event') return enqueueCaller;
    return vi.fn();
  });
  return {
    mockEnqueueCaller: enqueueCaller,
    mockCreateEdgeFunctionCaller: createCaller,
  };
});

vi.mock('@/lib/infrastructure', () => ({
  createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  supabase: {
    from: vi.fn(),
  },
}));

describe('Email Templates Domain API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEmailTemplates', () => {
    it('fetches email templates ordered by created_at desc', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Welcome',
          slug: 'welcome',
          resend_template_id: 'resend-1',
          required_variables: ['name'],
          created_at: '2026-09-28T00:00:00Z',
          updated_at: '2026-09-28T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({ data: mockTemplates, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await fetchEmailTemplates();
      expect(result).toEqual(mockTemplates);
      expect(supabase.from).toHaveBeenCalledWith('email_templates');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('throws when select query errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('DB Error') }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await expect(fetchEmailTemplates()).rejects.toThrow('DB Error');
    });

    it('rejects malformed rows from the database', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [{ id: 'template-1', required_variables: 'name' }],
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await expect(fetchEmailTemplates()).rejects.toThrow();
    });
  });

  describe('fetchEmailTemplateById', () => {
    it('fetches a single template by id', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Welcome',
        slug: 'welcome',
        resend_template_id: 'resend-1',
        required_variables: [],
        created_at: '2026-09-28T00:00:00Z',
        updated_at: '2026-09-28T00:00:00Z',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockTemplate, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await fetchEmailTemplateById('template-1');
      expect(result).toEqual(mockTemplate);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'template-1');
    });
  });

  describe('saveEmailTemplate', () => {
    it('updates an existing template when id is present', async () => {
      const input = {
        id: 'template-1',
        name: 'Updated Name',
        slug: 'welcome',
        resend_template_id: 'resend-2',
        required_variables: ['first_name'],
      };

      const mockUpdated = {
        ...input,
        created_at: '2026-09-28T00:00:00Z',
        updated_at: '2026-09-28T01:00:00Z',
      };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: mockUpdated, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await saveEmailTemplate(input);
      expect(result).toEqual(mockUpdated);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          slug: 'welcome',
          resend_template_id: 'resend-2',
          required_variables: ['first_name'],
        }),
      );
    });

    it('inserts a new template when id is omitted', async () => {
      const input = {
        name: 'New Template',
        slug: 'new_slug',
        resend_template_id: 'resend-3',
        required_variables: ['code'],
      };

      const mockCreated = {
        id: 'template-new',
        ...input,
        created_at: '2026-09-28T00:00:00Z',
        updated_at: '2026-09-28T00:00:00Z',
      };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: mockCreated, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await saveEmailTemplate(input);
      expect(result).toEqual(mockCreated);
      expect(mockQuery.insert).toHaveBeenCalledWith([
        {
          name: 'New Template',
          slug: 'new_slug',
          resend_template_id: 'resend-3',
          required_variables: ['code'],
        },
      ]);
    });
  });

  describe('enqueueEventNotification', () => {
    it('invokes edge function successfully', async () => {
      mockEnqueueCaller.mockResolvedValueOnce({ success: true, message_id: 123 });

      const payload = {
        event_type: 'email_notification',
        recipient: 'test@example.com',
        template_slug: 'welcome',
        metadata: { name: 'Alex' },
      };

      const result = await enqueueEventNotification(payload);
      expect(result).toEqual({ success: true, message_id: 123 });
      expect(mockEnqueueCaller).toHaveBeenCalledWith(payload);
    });

    it('throws error when data.success is false', async () => {
      mockEnqueueCaller.mockResolvedValueOnce({ success: false, message_id: 0 });

      await expect(
        enqueueEventNotification({
          event_type: 'email_notification',
          recipient: 'test@example.com',
          template_slug: 'welcome',
          metadata: {},
        }),
      ).rejects.toThrow('Failed to enqueue event notification');
    });
  });
});
