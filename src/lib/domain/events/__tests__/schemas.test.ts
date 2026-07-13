import { describe, expect, it } from 'vitest';

import { createEventSchema, publishEventSchema, updateEventSchema } from '@/lib/domain/events';

const validEventInput = {
  title: 'World Cup Registration',
  slug: 'world-cup-registration',
  description: 'Public event registration',
  location: 'Main Hall',
  starts_at: '2026-07-01T10:00:00.000Z',
  ends_at: '2026-07-01T12:00:00.000Z',
  registration_opens_at: '2026-06-01T10:00:00.000Z',
  registration_closes_at: '2026-06-30T10:00:00.000Z',
  status: 'draft' as const,
  duplicate_policy: 'block' as const,
  registration_mode: 'open' as const,
};

describe('events schemas', () => {
  it('accepts valid create event input', () => {
    const parsed = createEventSchema.parse(validEventInput);
    expect(parsed.slug).toBe('world-cup-registration');
  });

  it('rejects create event input with invalid slug format', () => {
    const parsed = createEventSchema.safeParse({
      ...validEventInput,
      slug: 'World_Cup_Registration',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects create event input when ends_at is before starts_at', () => {
    const parsed = createEventSchema.safeParse({
      ...validEventInput,
      starts_at: '2026-07-01T12:00:00.000Z',
      ends_at: '2026-07-01T10:00:00.000Z',
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts valid update event input', () => {
    const parsed = updateEventSchema.parse({
      title: 'Updated Event',
      description: 'Updated description',
      location: 'Room A',
      starts_at: '2026-07-01T10:00:00.000Z',
      ends_at: '2026-07-01T12:00:00.000Z',
      registration_opens_at: '2026-06-01T10:00:00.000Z',
      registration_closes_at: '2026-06-30T10:00:00.000Z',
      status: 'published',
      duplicate_policy: 'allow_update',
      registration_mode: 'closed',
    });

    expect(parsed.status).toBe('published');
  });

  it('accepts allow_multiple as a duplicate policy', () => {
    const parsed = createEventSchema.parse({
      ...validEventInput,
      duplicate_policy: 'allow_multiple',
    });

    expect(parsed.duplicate_policy).toBe('allow_multiple');
  });

  it('requires publish schema fields needed for publish', () => {
    const parsed = publishEventSchema.safeParse({
      title: 'Publish Ready Event',
      slug: 'publish-ready-event',
      description: '',
      location: '',
      starts_at: '',
      ends_at: '',
      registration_opens_at: '',
      registration_closes_at: '',
      status: 'published',
      duplicate_policy: 'block',
      registration_mode: 'open',
    });

    expect(parsed.success).toBe(false);
  });
});
