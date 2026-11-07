import { Cake, HeartIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  MILESTONE_DEFINITIONS,
  getMilestoneTypeBadgeClass,
  getMilestoneTypeIcon,
  getMilestoneTypeLabel,
} from '../milestoneBadgeUtils';

describe('milestoneBadgeUtils', () => {
  describe('MILESTONE_DEFINITIONS', () => {
    it('should have birthday milestone definition', () => {
      const birthday = MILESTONE_DEFINITIONS.find((d) => d.type === 'birthday');
      expect(birthday).toBeDefined();
      expect(birthday?.label).toBe('Birthday');
      expect(birthday?.labelPlural).toBe('Birthdays');
      expect(birthday?.icon).toBeDefined();
      expect(birthday?.badgeClassName).toContain('primary');
    });

    it('should have wedding_anniversary milestone definition', () => {
      const anniversary = MILESTONE_DEFINITIONS.find((d) => d.type === 'wedding_anniversary');
      expect(anniversary).toBeDefined();
      expect(anniversary?.label).toBe('Wedding Anniversary');
      expect(anniversary?.labelPlural).toBe('Wedding Anniversaries');
      expect(anniversary?.icon).toBeDefined();
      expect(anniversary?.badgeClassName).toContain('red');
    });

    it('should have exactly 2 milestone definitions', () => {
      expect(MILESTONE_DEFINITIONS).toHaveLength(2);
    });
  });

  describe('getMilestoneTypeLabel', () => {
    it('should return correct label for birthday', () => {
      expect(getMilestoneTypeLabel('birthday')).toBe('Birthday');
    });

    it('should return correct label for wedding_anniversary', () => {
      expect(getMilestoneTypeLabel('wedding_anniversary')).toBe('Wedding Anniversary');
    });

    it('should return type as fallback for unknown milestone', () => {
      const unknownType = 'unknown_milestone' as unknown as 'birthday' | 'wedding_anniversary';
      expect(getMilestoneTypeLabel(unknownType)).toBe('unknown_milestone');
    });
  });

  describe('getMilestoneTypeBadgeClass', () => {
    it('should return birthday badge class', () => {
      const badgeClass = getMilestoneTypeBadgeClass('birthday');
      expect(badgeClass).toContain('border');
      expect(badgeClass).toContain('primary');
      expect(badgeClass).toContain('bg-primary/10');
      expect(badgeClass).toContain('text-primary');
    });

    it('should return wedding_anniversary badge class', () => {
      const badgeClass = getMilestoneTypeBadgeClass('wedding_anniversary');
      expect(badgeClass).toContain('border');
      expect(badgeClass).toContain('red');
      expect(badgeClass).toContain('bg-red-50');
      expect(badgeClass).toContain('!text-red-800');
    });

    it('should return default badge class for unknown milestone', () => {
      const unknownType = 'unknown_milestone' as unknown as 'birthday' | 'wedding_anniversary';
      const badgeClass = getMilestoneTypeBadgeClass(unknownType);
      expect(badgeClass).toBe('border border-primary/20 bg-primary/10 text-primary');
    });
  });

  describe('getMilestoneTypeIcon', () => {
    it('should return Cake icon for birthday', () => {
      const icon = getMilestoneTypeIcon('birthday');
      expect(icon).toBeDefined();
      expect(icon).toBe(Cake);
    });

    it('should return HeartIcon for wedding_anniversary', () => {
      const icon = getMilestoneTypeIcon('wedding_anniversary');
      expect(icon).toBeDefined();
      expect(icon).toBe(HeartIcon);
    });

    it('should return default Cake icon for unknown milestone', () => {
      const unknownType = 'unknown_milestone' as unknown as 'birthday' | 'wedding_anniversary';
      const icon = getMilestoneTypeIcon(unknownType);
      expect(icon).toBeDefined();
      expect(icon).toBe(Cake);
    });

    it('should return same icon for birthday as MILESTONE_DEFINITIONS', () => {
      const testIcon = getMilestoneTypeIcon('birthday');
      const definedIcon = MILESTONE_DEFINITIONS.find((d) => d.type === 'birthday')?.icon;
      expect(testIcon).toBe(definedIcon);
    });
  });
});
