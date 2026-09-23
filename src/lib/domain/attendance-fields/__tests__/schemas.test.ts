import { describe, expect, it } from 'vitest';

import { buildDynamicAttendanceResponseSchema } from '@/lib/domain/attendance-fields/schemas';
import type { AttendanceField } from '@/lib/domain/attendance-fields/types';

const EVENT_ID = '12345678-1234-1234-1234-123456789012';

function createAttendanceField(overrides: Partial<AttendanceField>): AttendanceField {
  return {
    id: 'c9707ebf-a95d-4f42-ba04-bde679f92ed8',
    event_id: EVENT_ID,
    field_key: 'field_key',
    label: 'Field Label',
    field_type: 'text',
    is_required: true,
    is_active: true,
    options: [],
    validation_rules: {},
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('buildDynamicAttendanceResponseSchema', () => {
  it('builds a schema for simple text fields', () => {
    const schema = buildDynamicAttendanceResponseSchema([
      createAttendanceField({
        field_key: 'first_name',
        label: 'First Name',
        field_type: 'text',
        is_required: true,
      }),
      createAttendanceField({
        id: '2',
        field_key: 'last_name',
        label: 'Last Name',
        field_type: 'text',
        is_required: false,
      }),
    ]);

    expect(schema.safeParse({ first_name: 'John', last_name: 'Doe' }).success).toBe(true);
    expect(schema.safeParse({ last_name: 'Doe' }).success).toBe(false); // first_name is required
    expect(schema.safeParse({ first_name: 'John' }).success).toBe(true); // last_name is optional
  });

  it('sanitizes validation rules with <= 0 for max, max_length, max_selections', () => {
    const schema = buildDynamicAttendanceResponseSchema([
      createAttendanceField({
        field_key: 'age',
        label: 'Age',
        field_type: 'number',
        is_required: true,
        validation_rules: { max: 0, min: 18 },
      }),
      createAttendanceField({
        id: '2',
        field_key: 'username',
        label: 'Username',
        field_type: 'text',
        is_required: true,
        validation_rules: { max_length: -1, min_length: 5 },
      }),
      createAttendanceField({
        id: '3',
        field_key: 'roles',
        label: 'Roles',
        field_type: 'multi_select',
        is_required: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
        validation_rules: { max_selections: 0 },
      }),
    ]);

    // max=0, max_length=-1, max_selections=0 should be omitted (i.e. unbounded above)
    expect(
      schema.safeParse({
        age: 100,
        username: 'long_username',
        roles: ['admin', 'user'],
      }).success,
    ).toBe(true);

    // but the min rules should still apply
    expect(
      schema.safeParse({ age: 17, username: 'long_username', roles: ['admin', 'user'] }).success,
    ).toBe(false); // age < 18
    expect(schema.safeParse({ age: 100, username: 'user', roles: ['admin', 'user'] }).success).toBe(
      false,
    ); // username length < 5
  });

  it('applies validation rules when they are > 0', () => {
    const schema = buildDynamicAttendanceResponseSchema([
      createAttendanceField({
        field_key: 'age',
        label: 'Age',
        field_type: 'number',
        is_required: true,
        validation_rules: { max: 30, min: 18 },
      }),
      createAttendanceField({
        id: '2',
        field_key: 'username',
        label: 'Username',
        field_type: 'text',
        is_required: true,
        validation_rules: { max_length: 10, min_length: 5 },
      }),
      createAttendanceField({
        id: '3',
        field_key: 'roles',
        label: 'Roles',
        field_type: 'multi_select',
        is_required: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
          { label: 'Guest', value: 'guest' },
        ],
        validation_rules: { max_selections: 2 },
      }),
    ]);

    // Valid case
    expect(
      schema.safeParse({
        age: 25,
        username: 'validuser',
        roles: ['admin', 'user'],
      }).success,
    ).toBe(true);

    // Violating max constraints
    expect(schema.safeParse({ age: 31, username: 'validuser', roles: ['admin'] }).success).toBe(
      false,
    );
    expect(schema.safeParse({ age: 25, username: 'thisistoolong', roles: ['admin'] }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ age: 25, username: 'validuser', roles: ['admin', 'user', 'guest'] })
        .success,
    ).toBe(false);
  });

  it('handles field.validation_rules being undefined or null gracefully', () => {
    const schema = buildDynamicAttendanceResponseSchema([
      createAttendanceField({
        field_key: 'no_rules',
        label: 'No Rules',
        field_type: 'text',
        is_required: true,
        validation_rules: undefined,
      }),
    ]);
    expect(schema.safeParse({ no_rules: 'abc' }).success).toBe(true);
  });
});
