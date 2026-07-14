import { assertEquals } from 'jsr:@std/assert@1';

import {
  type UniquenessCandidateField,
  type UniquenessComponentField,
  resolveCompoundScopeKey,
  selectUniquenessComponentFields,
} from './uniqueness.ts';

const baseField = {
  field_type: 'text',
  label: 'Base Field',
  validation_rules: {},
} satisfies Omit<UniquenessCandidateField, 'field_key'>;

function makeField(overrides: Partial<UniquenessCandidateField>): UniquenessCandidateField {
  return {
    field_key: 'field_key',
    ...baseField,
    ...overrides,
  };
}

function makeUniquenessField(
  overrides: Partial<UniquenessComponentField>,
): UniquenessComponentField {
  return {
    field_key: 'field_key',
    field_type: 'text',
    label: 'Field Label',
    ...overrides,
  };
}

Deno.test(
  'selectUniquenessComponentFields keeps only fields flagged as unique key components',
  () => {
    const fields: UniquenessCandidateField[] = [
      makeField({
        field_key: 'team_name',
        label: 'Team Name',
        validation_rules: { unique_key_component: true, ignored: 'value' },
      }),
      makeField({
        field_key: 'notes',
        label: 'Notes',
        validation_rules: { unique_key_component: false },
      }),
      makeField({
        field_key: 'guests_count',
        field_type: 'number',
        label: 'Guests',
        validation_rules: null,
      }),
    ];

    assertEquals(selectUniquenessComponentFields(fields), [
      {
        field_key: 'team_name',
        field_type: 'text',
        label: 'Team Name',
      },
    ]);
  },
);

Deno.test('resolveCompoundScopeKey returns null with no uniqueness fields', () => {
  assertEquals(resolveCompoundScopeKey({ team_name: 'Alpha' }, []), {
    scopeKey: null,
    errors: [],
  });
});

Deno.test('resolveCompoundScopeKey returns field errors when uniqueness values are missing', () => {
  const result = resolveCompoundScopeKey(
    {
      team_name: 'Alpha',
      slot_choice: '',
    },
    [
      makeUniquenessField({ field_key: 'team_name', label: 'Team Name' }),
      makeUniquenessField({ field_key: 'slot_choice', label: 'Slot Choice' }),
    ],
  );

  assertEquals(result, {
    scopeKey: null,
    errors: [
      {
        fieldKey: 'slot_choice',
        message: 'Slot Choice is required for duplicate matching.',
      },
    ],
  });
});

Deno.test('resolveCompoundScopeKey normalizes and encodes text values', () => {
  const result = resolveCompoundScopeKey(
    {
      team_name: '  Alpha Team / West  ',
      lead_email: '  LEAD@Example.COM ',
    },
    [
      makeUniquenessField({ field_key: 'team_name', label: 'Team Name' }),
      makeUniquenessField({ field_key: 'lead_email', label: 'Lead Email' }),
    ],
  );

  assertEquals(result, {
    scopeKey: 'compound:team_name=alpha%20team%20%2F%20west|lead_email=lead%40example.com',
    errors: [],
  });
});

Deno.test('resolveCompoundScopeKey sorts multi-select values before encoding', () => {
  const result = resolveCompoundScopeKey(
    {
      roles: [' volunteer ', 'speaker', 'admin'],
    },
    [makeUniquenessField({ field_key: 'roles', field_type: 'multi_select', label: 'Roles' })],
  );

  assertEquals(result, {
    scopeKey: 'compound:roles=admin%2Cspeaker%2Cvolunteer',
    errors: [],
  });
});

Deno.test('resolveCompoundScopeKey sorts selected toggle options before encoding', () => {
  const result = resolveCompoundScopeKey(
    {
      sessions: {
        ' Session B ': true,
        'Session A': 1,
        'Session C': false,
      },
    },
    [
      makeUniquenessField({
        field_key: 'sessions',
        field_type: 'multi_select_toggle',
        label: 'Sessions',
      }),
    ],
  );

  assertEquals(result, {
    scopeKey: 'compound:sessions=Session%20A%2CSession%20B',
    errors: [],
  });
});

Deno.test('resolveCompoundScopeKey normalizes date and datetime values to the calendar day', () => {
  const result = resolveCompoundScopeKey(
    {
      attendance_date: '2026-07-14T09:30:00-05:00',
      follow_up_date: '2026-08-01',
    },
    [
      makeUniquenessField({
        field_key: 'attendance_date',
        field_type: 'datetime',
        label: 'Attendance Date',
      }),
      makeUniquenessField({
        field_key: 'follow_up_date',
        field_type: 'date',
        label: 'Follow Up Date',
      }),
    ],
  );

  assertEquals(result, {
    scopeKey: 'compound:attendance_date=2026-07-14|follow_up_date=2026-08-01',
    errors: [],
  });
});

Deno.test('resolveCompoundScopeKey normalizes boolean values from multiple representations', () => {
  const truthyResult = resolveCompoundScopeKey({ consent: '1' }, [
    makeUniquenessField({ field_key: 'consent', field_type: 'boolean', label: 'Consent' }),
  ]);

  const falsyResult = resolveCompoundScopeKey({ consent: 0 }, [
    makeUniquenessField({ field_key: 'consent', field_type: 'boolean', label: 'Consent' }),
  ]);

  assertEquals(truthyResult, {
    scopeKey: 'compound:consent=true',
    errors: [],
  });
  assertEquals(falsyResult, {
    scopeKey: 'compound:consent=false',
    errors: [],
  });
});
