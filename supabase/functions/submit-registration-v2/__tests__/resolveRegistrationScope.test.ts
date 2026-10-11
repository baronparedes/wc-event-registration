import { assertEquals } from '@std/assert';
import { resolveRegistrationScope } from '../handlers/resolveRegistrationScope.ts';

Deno.test('resolveRegistrationScope returns idempotency key when no fields', () => {
  const result = resolveRegistrationScope([], {}, 'allow_multiple', 'idemp-1');
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.registrationScopeKey, 'idemp-1');
    assertEquals(result.data.hasCompoundScope, false);
  }
});

Deno.test('resolveRegistrationScope returns primary for block policy with no uniqueness fields', () => {
  const result = resolveRegistrationScope([], {}, 'block', 'idemp-1');
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.registrationScopeKey, 'primary');
    assertEquals(result.data.hasCompoundScope, false);
  }
});

Deno.test('resolveRegistrationScope returns primary for allow_update policy with no uniqueness fields', () => {
  const result = resolveRegistrationScope([], {}, 'allow_update', 'idemp-1');
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.registrationScopeKey, 'primary');
    assertEquals(result.data.hasCompoundScope, false);
  }
});

Deno.test('resolveRegistrationScope returns compound scope if fields support it', () => {
  const mockFields = [
    {
      id: 'field-1',
      field_key: 'unique_field',
      label: 'Unique',
      field_type: 'text' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [],
      validation_rules: { unique_key_component: true },
    }
  ];

  const responses = {
    unique_field: 'compound-value'
  };

  const result = resolveRegistrationScope(mockFields, responses, 'allow_multiple', 'idemp-1');
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.registrationScopeKey, 'compound:unique_field=compound-value');
    assertEquals(result.data.hasCompoundScope, true);
  }
});

Deno.test('resolveRegistrationScope returns errors if compound scope value is missing', () => {
  const mockFields = [
    {
      id: 'field-1',
      field_key: 'unique_field',
      label: 'Unique',
      field_type: 'text' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [],
      validation_rules: { unique_key_component: true },
    }
  ];

  const responses = {}; // Missing unique_field

  const result = resolveRegistrationScope(mockFields, responses, 'allow_multiple', 'idemp-1');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'VALIDATION_FAILED');
    assertEquals(result.errors?.length, 1);
    assertEquals(result.errors?.[0].fieldKey, 'unique_field');
  }
});
