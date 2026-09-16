import { describe, expect, it } from 'vitest';

import type { PublicEventField } from '@/lib/domain/event-fields';

import { buildSubmitPublicRegistrationSchema } from '../schemas';

describe('buildSubmitPublicRegistrationSchema with Conditional Visibility', () => {
  const fields: PublicEventField[] = [
    {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'category',
      label: 'Registration Category',
      field_type: 'select',
      applicability: 'both',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [
        { label: 'Standard', value: 'Standard' },
        { label: 'VIP', value: 'VIP' },
        { label: 'Others', value: 'Others' },
      ],
      validation_rules: {},
      display_order: 1,
    },
    {
      id: 'field-2',
      event_id: 'event-1',
      field_key: 'specify_other',
      label: 'Specify Other Category',
      field_type: 'text',
      applicability: 'both',
      is_required: true,
      is_active: true,
      placeholder: null,
      help_text: null,
      options: [],
      validation_rules: {
        visibility_rule: {
          depends_on_field_key: 'category',
          equals_value: 'Others',
        },
      },
      display_order: 2,
    },
  ];

  const validAttendee = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
  };

  it('passes when conditionally hidden required field is omitted from responses', () => {
    const schema = buildSubmitPublicRegistrationSchema(fields);

    const result = schema.safeParse({
      event_slug: 'tech-summit-2026',
      attendee: validAttendee,
      responses: {
        category: 'Standard',
      },
      idempotency_key: 'key-123',
    });

    expect(result.success).toBe(true);
  });

  it('fails when conditionally visible required field is missing from responses', () => {
    const schema = buildSubmitPublicRegistrationSchema(fields);

    const result = schema.safeParse({
      event_slug: 'tech-summit-2026',
      attendee: validAttendee,
      responses: {
        category: 'Others',
      },
      idempotency_key: 'key-123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('specify_other'));
      expect(issue).toBeDefined();
      expect(issue?.message).toMatch(/Specify Other Category is required/i);
    }
  });

  it('fails when conditionally visible required field is empty string', () => {
    const schema = buildSubmitPublicRegistrationSchema(fields);

    const result = schema.safeParse({
      event_slug: 'tech-summit-2026',
      attendee: validAttendee,
      responses: {
        category: 'Others',
        specify_other: '',
      },
      idempotency_key: 'key-123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('specify_other'));
      expect(issue).toBeDefined();
      expect(issue?.message).toMatch(/Specify Other Category is required/i);
    }
  });

  it('passes when conditionally visible required field has a valid value', () => {
    const schema = buildSubmitPublicRegistrationSchema(fields);

    const result = schema.safeParse({
      event_slug: 'tech-summit-2026',
      attendee: validAttendee,
      responses: {
        category: 'Others',
        specify_other: 'Community Volunteer',
      },
      idempotency_key: 'key-123',
    });

    expect(result.success).toBe(true);
  });

  it('fails when attendee info is invalid', () => {
    const schema = buildSubmitPublicRegistrationSchema(fields);

    const result = schema.safeParse({
      event_slug: 'tech-summit-2026',
      attendee: {
        ...validAttendee,
        email: 'invalid-email',
      },
      responses: {
        category: 'Standard',
      },
      idempotency_key: 'key-123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
      expect(emailIssue).toBeDefined();
    }
  });
});
