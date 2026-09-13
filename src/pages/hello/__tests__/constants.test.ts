import { describe, expect, it } from 'vitest';

import { HELLO_CAROUSEL_SLIDES } from '../constants';

describe('HELLO_CAROUSEL_SLIDES', () => {
  it('contains exactly 8 slides', () => {
    expect(HELLO_CAROUSEL_SLIDES).toHaveLength(8);
  });

  it('has valid, sequential IDs from 1 to 8', () => {
    const ids = HELLO_CAROUSEL_SLIDES.map((slide) => slide.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('has non-empty titles, alts, and image sources for every slide', () => {
    HELLO_CAROUSEL_SLIDES.forEach((slide) => {
      expect(slide.title).toBeTruthy();
      expect(typeof slide.title).toBe('string');
      expect(slide.alt).toBeTruthy();
      expect(typeof slide.alt).toBe('string');
      expect(slide.src).toBeTruthy();
      expect(typeof slide.src).toBe('string');
    });
  });
});
