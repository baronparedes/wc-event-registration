import { describe, expect, it } from 'vitest';

import { areAllFormRequirementsMet, getFormPublishRequirements } from '../metadata';

describe('form publish metadata', () => {
  it('maps publish requirements to filled states based on fieldsCount', () => {
    const requirements = getFormPublishRequirements({
      title: '  Feedback Form  ',
      slug: 'feedback-form',
      fieldsCount: 0,
    });

    expect(requirements).toEqual([
      { key: 'title', label: 'Form Title', filled: true },
      { key: 'slug', label: 'Form Slug', filled: true },
      { key: 'fields', label: 'At least 1 Dynamic Field', filled: false },
    ]);
  });

  it('maps publish requirements to filled states based on fields array', () => {
    const requirements = getFormPublishRequirements({
      title: '',
      slug: '   ',
      fields: [{ is_active: true }],
    });

    expect(requirements).toEqual([
      { key: 'title', label: 'Form Title', filled: false },
      { key: 'slug', label: 'Form Slug', filled: false },
      { key: 'fields', label: 'At least 1 Dynamic Field', filled: true },
    ]);
  });

  it('reports whether all publish requirements are met', () => {
    expect(
      areAllFormRequirementsMet({
        title: 'Volunteer Sign-up',
        slug: 'volunteer-signup',
        fieldsCount: 3,
      }),
    ).toBe(true);

    expect(
      areAllFormRequirementsMet({
        title: 'Volunteer Sign-up',
        slug: 'volunteer-signup',
        fieldsCount: 0,
      }),
    ).toBe(false);

    expect(
      areAllFormRequirementsMet({
        title: '',
        slug: 'volunteer-signup',
        fieldsCount: 1,
      }),
    ).toBe(false);
  });
});
