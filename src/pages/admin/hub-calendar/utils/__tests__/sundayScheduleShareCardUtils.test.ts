import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import { groupEntriesByPrimaryRole } from '../sundayScheduleShareCardUtils';

function createMember(id: string, role?: string): AdminMember {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id,
    member_id: `MEM-${id}`,
    avatar_object_key: null,
    is_active: true,
    first_name: firstName,
    last_name: lastName,
    nickname: firstName,
    full_name: `${firstName} ${lastName}`,
    email: faker.internet.exampleEmail({ firstName, lastName }),
    phone: '555-1234',
    date_of_birth: '1990-01-01',
    role: role ?? '',
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };
}

describe('sundayScheduleShareCardUtils', () => {
  describe('groupEntriesByPrimaryRole', () => {
    it('returns empty array when entries list is empty', () => {
      const result = groupEntriesByPrimaryRole([]);
      expect(result).toEqual([]);
    });

    it('groups members by primary role and extracts secondary roles', () => {
      const m1 = createMember('1', 'Usher');
      const m2 = createMember('2', 'IMT Support / Usher');
      const m3 = createMember('3', 'Usher');
      const m4 = createMember('4', 'Prayer Coach / Backroom Support');
      const m5 = createMember('5', ''); // Unassigned

      const entries: MemberScheduleEntry[] = [
        { member: m1, sundayKey: 'first_sunday', timeSlots: ['9AM'] },
        { member: m2, sundayKey: 'first_sunday', timeSlots: ['9AM'] },
        { member: m3, sundayKey: 'first_sunday', timeSlots: ['9AM'] },
        { member: m4, sundayKey: 'first_sunday', timeSlots: ['9AM'] },
        { member: m5, sundayKey: 'first_sunday', timeSlots: ['9AM'] },
      ];

      const result = groupEntriesByPrimaryRole(entries);

      expect(result).toHaveLength(4);

      // Verify Usher group
      const usherGroup = result.find((g) => g.primaryRole === 'Usher');
      expect(usherGroup).toBeDefined();
      expect(usherGroup?.totalCount).toBe(2);
      expect(usherGroup?.members).toEqual([
        { entry: entries[0], secondaryRole: null },
        { entry: entries[2], secondaryRole: null },
      ]);

      // Verify IMT Support group (primary role of Bob)
      const imtGroup = result.find((g) => g.primaryRole === 'IMT Support');
      expect(imtGroup).toBeDefined();
      expect(imtGroup?.totalCount).toBe(1);
      expect(imtGroup?.members).toEqual([{ entry: entries[1], secondaryRole: 'Usher' }]);

      // Verify Prayer Coach group
      const prayerGroup = result.find((g) => g.primaryRole === 'Prayer Coach');
      expect(prayerGroup).toBeDefined();
      expect(prayerGroup?.totalCount).toBe(1);
      expect(prayerGroup?.members).toEqual([
        { entry: entries[3], secondaryRole: 'Backroom Support' },
      ]);

      // Verify General Volunteer group
      const generalGroup = result.find((g) => g.primaryRole === 'General Volunteer');
      expect(generalGroup).toBeDefined();
      expect(generalGroup?.totalCount).toBe(1);
      expect(generalGroup?.members).toEqual([{ entry: entries[4], secondaryRole: null }]);
    });
  });
});
