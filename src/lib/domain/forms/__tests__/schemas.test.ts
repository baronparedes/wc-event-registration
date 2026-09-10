import { describe, expect, it } from 'vitest';

import {
  adminFormInputSchema,
  formAudienceSchema,
  formDuplicatePolicySchema,
  formFieldInputSchema,
  formStatusSchema,
} from '../schemas';

describe('forms schemas', () => {
  it('validates admin form input schema successfully', () => {
    const validData = {
      title: 'Schedule Change Request',
      slug: 'schedule-change-request',
      description: 'Request for change in schedule',
      status: 'published',
      duplicate_policy: 'allow_update',
      audience: 'members',
      metadata: {},
    };

    const result = adminFormInputSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid slugs in admin form input schema', () => {
    const invalidData = {
      title: 'Invalid Slug Form',
      slug: 'Invalid Slug With Spaces!',
      status: 'published',
      duplicate_policy: 'block',
      audience: 'members',
    };

    const result = adminFormInputSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates form field input schema with options', () => {
    const validField = {
      field_key: 'requested_time',
      label: 'Requested Time Slot',
      field_type: 'select',
      is_required: true,
      is_active: true,
      options: [
        { label: 'Morning', value: 'morning' },
        { label: 'Afternoon', value: 'afternoon' },
      ],
      validation_rules: {},
      field_applicability: 'all',
      display_order: 10,
    };

    const result = formFieldInputSchema.safeParse(validField);
    expect(result.success).toBe(true);
  });

  it('validates enums correctly', () => {
    expect(formStatusSchema.safeParse('published').success).toBe(true);
    expect(formStatusSchema.safeParse('draft').success).toBe(true);
    expect(formStatusSchema.safeParse('unknown').success).toBe(false);

    expect(formAudienceSchema.safeParse('members').success).toBe(true);
    expect(formAudienceSchema.safeParse('public').success).toBe(true);
    expect(formAudienceSchema.safeParse('members_and_public').success).toBe(true);

    expect(formDuplicatePolicySchema.safeParse('block').success).toBe(true);
    expect(formDuplicatePolicySchema.safeParse('allow_update').success).toBe(true);
  });
});
