import {
  adminFormInputSchema,
  formAudienceSchema,
  formDuplicatePolicySchema,
  formFieldFormSchema,
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

  it('validates rating field in formFieldInputSchema', () => {
    const validRatingField = {
      field_key: 'session_rating',
      label: 'Session Rating',
      field_type: 'rating',
      is_required: false,
      is_active: true,
      options: [],
      validation_rules: {},
      field_applicability: 'all',
      display_order: 0,
    };

    const result = formFieldInputSchema.safeParse(validRatingField);
    expect(result.success).toBe(true);
  });

  it('validates rating scale in formFieldFormSchema', () => {
    const validForm = formFieldFormSchema.safeParse({
      field_key: 'session_rating',
      label: 'Session Rating',
      field_type: 'rating',
      is_required: false,
      is_active: true,
      options: [],
      field_applicability: 'all',
      val_max: '8',
    });
    expect(validForm.success).toBe(true);

    const invalidForm = formFieldFormSchema.safeParse({
      field_key: 'session_rating',
      label: 'Session Rating',
      field_type: 'rating',
      is_required: false,
      is_active: true,
      options: [],
      field_applicability: 'all',
      val_max: '20',
    });
    expect(invalidForm.success).toBe(false);
    if (!invalidForm.success) {
      expect(invalidForm.error.issues[0]?.message).toBe(
        'Rating scale must be a whole number between 1 and 10.',
      );
    }
  });

  it('validates required_approval in formFieldInputSchema', () => {
    const validApprovalField = {
      field_key: 'manager_approval',
      label: 'Manager Approval',
      field_type: 'required_approval',
      is_required: false,
      is_active: true,
      options: [],
      validation_rules: {
        approver_email: 'manager@example.com',
        approver_name: 'Manager Bob',
      },
      field_applicability: 'all',
      display_order: 0,
    };

    const result = formFieldInputSchema.safeParse(validApprovalField);
    expect(result.success).toBe(true);
  });

  it('validates approver requirements in formFieldFormSchema for required_approval', () => {
    const invalidForm = formFieldFormSchema.safeParse({
      field_key: 'manager_approval',
      label: 'Manager Approval',
      field_type: 'required_approval',
      is_required: false,
      is_active: true,
      options: [],
      field_applicability: 'all',
      val_approver_email: '',
    });
    expect(invalidForm.success).toBe(false);
    if (!invalidForm.success) {
      expect(invalidForm.error.issues[0]?.message).toBe('Please select an approver.');
    }

    const validForm = formFieldFormSchema.safeParse({
      field_key: 'manager_approval',
      label: 'Manager Approval',
      field_type: 'required_approval',
      is_required: false,
      is_active: true,
      options: [],
      field_applicability: 'all',
      val_approver_email: 'leader@example.com',
      val_approver_name: 'Leader Jane',
      val_approver_user_id: 'user-123',
    });
    expect(validForm.success).toBe(true);
  });
});
