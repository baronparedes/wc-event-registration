import { describe, expect, it } from 'vitest';

import { type AdminMember, MEMBER_EXTRA_METADATA_KEYS } from '@/lib/domain/members';

import { buildMilestoneEntries, getMonthDayKeyFromMember, parseMonthDay } from '../milestones';

function makeMember(overrides?: Partial<AdminMember>): AdminMember {
  return {
    id: 'm1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    full_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    nickname: 'Johnny',
    email: 'john@example.com',
    phone: '123-456',
    date_of_birth: '1990-09-15',
    role: 'Usher',
    category: 'adult',
    extra_metadata: {
      [MEMBER_EXTRA_METADATA_KEYS.weddingAnniversaryDate]: '2015-09-20',
    },
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

describe('hub-calendar milestones', () => {
  it('parses valid date strings into month and day', () => {
    expect(parseMonthDay('1990-09-15')).toEqual({ month: 9, day: 15 });
    expect(parseMonthDay(null)).toBeNull();
    expect(parseMonthDay('')).toBeNull();
    expect(parseMonthDay('invalid-date')).toBeNull();
  });

  it('builds milestone entries for birthday and wedding anniversary', () => {
    const member = makeMember();
    const entries = buildMilestoneEntries([member]);

    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe('birthday');
    expect(entries[0].id).toBe('m1-birthday');
    expect(entries[1].type).toBe('wedding_anniversary');
    expect(entries[1].id).toBe('m1-wedding_anniversary');
  });

  it('gets month day key for member milestone', () => {
    const member = makeMember();
    expect(getMonthDayKeyFromMember(member, 'birthday')).toBe('09-15');
    expect(getMonthDayKeyFromMember(member, 'wedding_anniversary')).toBe('09-20');
  });
});
