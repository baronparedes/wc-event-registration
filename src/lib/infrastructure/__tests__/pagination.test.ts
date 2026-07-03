import { describe, expect, it } from 'vitest';

import {
  decodeOffsetCursor,
  getCurrentPageFromCursor,
  getPageCursor,
  getTotalPages,
} from '../pagination';

describe('pagination', () => {
  it('decodes cursor offsets defensively', () => {
    expect(decodeOffsetCursor(undefined)).toBe(0);
    expect(decodeOffsetCursor(null)).toBe(0);
    expect(decodeOffsetCursor('')).toBe(0);
    expect(decodeOffsetCursor('12')).toBe(12);
    expect(decodeOffsetCursor('-1')).toBe(0);
    expect(decodeOffsetCursor('abc')).toBe(0);
  });

  it('computes page cursors and page numbers', () => {
    expect(getPageCursor(1, 25)).toBeNull();
    expect(getPageCursor(3.7, 25)).toBe('50');
    expect(getPageCursor(Number.NaN, 25)).toBeNull();
    expect(getCurrentPageFromCursor(null, 25)).toBe(1);
    expect(getCurrentPageFromCursor('50', 25)).toBe(3);
  });

  it('returns at least one total page', () => {
    expect(getTotalPages(0, 25)).toBe(1);
    expect(getTotalPages(1, 25)).toBe(1);
    expect(getTotalPages(26, 25)).toBe(2);
  });
});
