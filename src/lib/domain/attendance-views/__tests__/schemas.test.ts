import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import {
  attendeeViewConfigSchema,
  deleteAttendanceSavedViewSchema,
  upsertAttendanceSavedViewSchema,
} from '../schemas';

describe('attendeeViewConfigSchema', () => {
  it('parses valid input with all fields', () => {
    const result = attendeeViewConfigSchema.parse({
      nameOrMemberQuery: 'John',
      role: ['Member'],
      category: 'Adult',
      checkInStatus: 'checked_in',
      dynamicFilters: [
        {
          field: { source: 'registration', fieldKey: 'service', label: 'Service' },
          value: '9AM',
        },
      ],
      groupBy: [{ source: 'attendance', fieldKey: 'area', label: 'Area', sortOrder: 0 }],
      visibleFields: [{ source: 'registration', fieldKey: 'service', label: 'Service' }],
    });

    expect(result.nameOrMemberQuery).toBe('John');
    expect(result.role).toEqual(['Member']);
    expect(result.category).toBe('Adult');
    expect(result.checkInStatus).toBe('checked_in');
    expect(result.dynamicFilters).toHaveLength(1);
    expect(result.groupBy).toHaveLength(1);
    expect(result.visibleFields).toHaveLength(1);
  });

  it('applies default values when fields are missing', () => {
    const result = attendeeViewConfigSchema.parse({});

    expect(result.nameOrMemberQuery).toBe('');
    expect(result.role).toEqual([]);
    expect(result.category).toBe('all');
    expect(result.checkInStatus).toBe('all');
    expect(result.dynamicFilters).toEqual([]);
    expect(result.groupBy).toEqual([]);
    expect(result.visibleFields).toEqual([]);
  });

  it('accepts "not_checked_in" and "all" as valid checkInStatus values', () => {
    expect(attendeeViewConfigSchema.parse({ checkInStatus: 'not_checked_in' }).checkInStatus).toBe(
      'not_checked_in',
    );

    expect(attendeeViewConfigSchema.parse({ checkInStatus: 'all' }).checkInStatus).toBe('all');
  });

  it('rejects invalid checkInStatus', () => {
    const result = attendeeViewConfigSchema.safeParse({ checkInStatus: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid DynamicFieldRef source', () => {
    const result = attendeeViewConfigSchema.safeParse({
      groupBy: [{ source: 'invalid', fieldKey: 'key', label: 'Label' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('upsertAttendanceSavedViewSchema', () => {
  const validViewConfig = {
    nameOrMemberQuery: '',
    role: [],
    category: 'all',
    checkInStatus: 'all' as const,
    dynamicFilters: [],
    groupBy: [],
    visibleFields: [],
  };

  it('accepts valid input with all fields', () => {
    const id = faker.string.uuid();
    const eventId = faker.string.uuid();
    const result = upsertAttendanceSavedViewSchema.parse({
      id,
      event_id: eventId,
      name: 'My View',
      view_config: validViewConfig,
    });

    expect(result.id).toBe(id);
    expect(result.event_id).toBe(eventId);
    expect(result.name).toBe('My View');
  });

  it('accepts input without optional id and name', () => {
    const result = upsertAttendanceSavedViewSchema.parse({
      event_id: faker.string.uuid(),
      view_config: validViewConfig,
    });

    expect(result.id).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  it('rejects empty name', () => {
    const result = upsertAttendanceSavedViewSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000002',
      name: '',
      view_config: validViewConfig,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid event_id UUID', () => {
    const result = upsertAttendanceSavedViewSchema.safeParse({
      event_id: 'not-a-uuid',
      view_config: validViewConfig,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid id UUID', () => {
    const result = upsertAttendanceSavedViewSchema.safeParse({
      id: 'not-a-uuid',
      event_id: '00000000-0000-0000-0000-000000000002',
      view_config: validViewConfig,
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteAttendanceSavedViewSchema', () => {
  it('accepts a valid UUID', () => {
    const id = faker.string.uuid();
    const result = deleteAttendanceSavedViewSchema.parse({ id });
    expect(result.id).toBe(id);
  });

  it('rejects a non-UUID id', () => {
    const result = deleteAttendanceSavedViewSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = deleteAttendanceSavedViewSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
