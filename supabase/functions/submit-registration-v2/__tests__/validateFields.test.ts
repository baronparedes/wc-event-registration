import { assertEquals } from '@std/assert';

import { validateFields } from '../handlers/validateFields.ts';

Deno.test('validateFields passes for valid required field', () => {
  const fields = [
    {
      id: 'field-1',
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'text' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [],
      validation_rules: {},
    },
  ];
  const responses = { team_name: 'Alpha' };

  const result = validateFields(fields, responses);
  assertEquals(result.ok, true);
});

Deno.test('validateFields fails for missing required field', () => {
  const fields = [
    {
      id: 'field-1',
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'text' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [],
      validation_rules: {},
    },
  ];
  const responses = {};

  const result = validateFields(fields, responses);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'VALIDATION_FAILED');
    assertEquals(result.errors?.length, 1);
    assertEquals(result.errors?.[0].fieldKey, 'team_name');
  }
});
