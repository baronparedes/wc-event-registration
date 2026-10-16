import { describe, expect, it } from 'vitest';

import { parseSlotChips } from '../parseSlotChips';

describe('parseSlotChips', () => {
  it('returns empty array for empty or null input', () => {
    expect(parseSlotChips(null)).toEqual([]);
    expect(parseSlotChips('')).toEqual([]);
    expect(parseSlotChips('   ')).toEqual([]);
  });

  it('parses single active slot', () => {
    expect(parseSlotChips('12:00 NN')).toEqual([{ text: '12:00 NN', isExcused: false }]);
  });

  it('parses multiple active slots separated by commas and "and"', () => {
    expect(parseSlotChips('9:00 AM, 12:00 NN and 3:00 PM')).toEqual([
      { text: '9:00 AM', isExcused: false },
      { text: '12:00 NN', isExcused: false },
      { text: '3:00 PM', isExcused: false },
    ]);
  });

  it('parses single excused slot and strips appended "(Excused)" word', () => {
    expect(parseSlotChips('3:00 PM (Excused)')).toEqual([{ text: '3:00 PM', isExcused: true }]);
  });

  it('parses mixed active and excused slots and strips appended "(Excused)" from chip text', () => {
    expect(parseSlotChips('9:00 AM, 12:00 NN (Excused) and 3:00 PM')).toEqual([
      { text: '9:00 AM', isExcused: false },
      { text: '12:00 NN', isExcused: true },
      { text: '3:00 PM', isExcused: false },
    ]);
  });
});
