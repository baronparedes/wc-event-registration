import { assertEquals } from '@std/assert';

import {
  type EventFieldWithValidation,
  buildFieldOptionCapacityWorkItems,
  buildFullCapacityValidationErrors,
  buildOptionCapacityContext,
  createOptionUsageCounter,
  extractSelectedOptionValues,
  extractSelectedOptionValuesFromStoredAnswer,
  getSlotConsumingSelectionsWithoutRole,
  incrementOptionUsageFromSelection,
  isFieldVisible,
  normalizePrimaryRoleValue,
  normalizeRoleValue,
  parseFunctionEnvironment,
  parseMaxSlotRoleAllotmentsByOption,
  parseMaxSlotsByOption,
  parseRequestBody,
  validateFieldValue,
  z,
} from '../validation.ts';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

function makeField(overrides: Partial<EventFieldWithValidation> = {}): EventFieldWithValidation {
  return {
    id: 'field-id',
    field_key: 'field',
    label: 'Field',
    field_type: 'text',
    is_required: false,
    options: [],
    validation_rules: {},
    ...overrides,
  };
}

function withEnvironment(values: Record<string, string | undefined>, run: () => void) {
  const previousValues = new Map(
    Object.keys(values).map((key) => [key, Deno.env.get(key)] as const),
  );

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }

  try {
    run();
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test('parseFunctionEnvironment requires Supabase settings and trims configured values', () => {
  withEnvironment(
    {
      SUPABASE_URL: ' https://example.supabase.co ',
      SUPABASE_SERVICE_ROLE_KEY: ' service-key ',
      CRON_ROLE_KEY: ' cron-key ',
    },
    () => {
      assertEquals(parseFunctionEnvironment(), {
        supabaseUrl: 'https://example.supabase.co',
        supabaseServiceKey: 'service-key',
        cronRoleKey: 'cron-key',
      });
    },
  );

  withEnvironment(
    { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined, CRON_ROLE_KEY: undefined },
    () => assertEquals(parseFunctionEnvironment(), null),
  );
});

Deno.test(
  'parseRequestBody distinguishes invalid JSON, schema failures, and valid payloads',
  async () => {
    const schema = z.object({ event_id: z.string().uuid(), rows: z.array(z.string()).min(1) });

    assertEquals(
      await parseRequestBody(
        new Request('https://example.test', { method: 'POST', body: '{' }),
        schema,
      ),
      { success: false, error: 'Invalid JSON payload' },
    );

    const invalid = await parseRequestBody(
      new Request('https://example.test', {
        method: 'POST',
        body: JSON.stringify({ event_id: 'bad', rows: [] }),
      }),
      schema,
    );
    assertEquals(invalid.success, false);
    if (!invalid.success) {
      assertEquals(invalid.error, 'Invalid request payload');
      assertEquals(invalid.details?.includes('event_id:'), true);
      assertEquals(invalid.details?.includes('rows:'), true);
    }

    assertEquals(
      await parseRequestBody(
        new Request('https://example.test', {
          method: 'POST',
          body: JSON.stringify({ event_id: EVENT_ID, rows: ['member-1'] }),
        }),
        schema,
      ),
      { success: true, data: { event_id: EVENT_ID, rows: ['member-1'] } },
    );
  },
);

Deno.test('role normalizers trim, lowercase, and select the first nonempty primary role', () => {
  assertEquals(normalizeRoleValue('  Prayer Coach '), 'prayer coach');
  assertEquals(normalizeRoleValue('  '), null);
  assertEquals(normalizePrimaryRoleValue(' / Prayer Coach / Usher '), 'prayer coach');
  assertEquals(normalizePrimaryRoleValue(null), null);
});

Deno.test('parseMaxSlotsByOption keeps only positive integer capacities', () => {
  assertEquals(
    parseMaxSlotsByOption({
      max_slots: { morning: 3, evening: 0, invalid: 1.5, text: '4', infinite: Infinity },
    }),
    { morning: 3 },
  );
  assertEquals(parseMaxSlotsByOption({ max_slots: [] }), {});
  assertEquals(parseMaxSlotsByOption(null), {});
});

Deno.test('parseMaxSlotRoleAllotmentsByOption supports modern and legacy role maps', () => {
  assertEquals(
    parseMaxSlotRoleAllotmentsByOption({
      max_slots_role_allotments: {
        morning: [
          { role: ' Prayer Coach ', alloted_slots: 2 },
          { role: 'Usher', alloted_slots: 1 },
          { role: 'invalid', alloted_slots: 0 },
        ],
        evening: { ' Usher ': 3, attendee: 1.2 },
      },
    }),
    { morning: { 'prayer coach': 2, usher: 1 }, evening: { usher: 3 } },
  );
  assertEquals(
    parseMaxSlotRoleAllotmentsByOption({
      max_slots_role_allotments: {
        morning: [
          { role: 'Prayer Coach', alloted_slots: 2 },
          { role: '*', alloted_slots: 4 },
          { role: 'Usher', alloted_slots: 1 },
        ],
      },
    }),
    { morning: { '*': 4 } },
  );
});

Deno.test(
  'buildOptionCapacityContext derives totals and filters only constrained selections',
  () => {
    assertEquals(
      buildOptionCapacityContext(
        'multi_select',
        {
          max_slots: { morning: 5 },
          max_slots_role_allotments: {
            morning: [
              { role: 'Prayer Coach', alloted_slots: 2 },
              { role: 'Usher', alloted_slots: 1 },
            ],
          },
        },
        ['morning', 'evening'],
      ),
      {
        maxSlotsByOption: { morning: 3 },
        roleAllotmentsByOption: { morning: { 'prayer coach': 2, usher: 1 } },
        constrainedSelections: ['morning'],
      },
    );
    assertEquals(buildOptionCapacityContext('text', { max_slots: { a: 1 } }, 'a'), null);
    assertEquals(buildOptionCapacityContext('select', { max_slots: { a: 1 } }, 'b'), null);
  },
);

Deno.test(
  'getSlotConsumingSelectionsWithoutRole excludes selections limited to specific roles',
  () => {
    assertEquals(
      getSlotConsumingSelectionsWithoutRole(['open', 'restricted', 'wildcard'], {
        restricted: { usher: 2 },
        wildcard: { '*': 3 },
      }),
      ['open', 'wildcard'],
    );
  },
);

Deno.test(
  'buildFieldOptionCapacityWorkItems only emits fields with selected constrained options',
  () => {
    const field = makeField({
      field_key: 'service',
      field_type: 'select',
      validation_rules: { max_slots: { morning: 2 } },
    });

    assertEquals(
      buildFieldOptionCapacityWorkItems([field], { service: 'morning' }).map((item) => ({
        fieldKey: item.fieldKey,
        constrainedSelections: item.constrainedSelections,
        slotConsumingSelectionsWithoutRole: item.slotConsumingSelectionsWithoutRole,
      })),
      [
        {
          fieldKey: 'service',
          constrainedSelections: ['morning'],
          slotConsumingSelectionsWithoutRole: ['morning'],
        },
      ],
    );
    assertEquals(buildFieldOptionCapacityWorkItems([field], { service: 'evening' }), []);
  },
);

Deno.test('option usage helpers initialize and increment only selected configured options', () => {
  const usage = createOptionUsageCounter(['morning', 'evening']);
  incrementOptionUsageFromSelection(usage, ['morning', 'evening'], ['morning', 'other']);
  assertEquals(usage, { morning: 1, evening: 0 });
});

Deno.test(
  'buildFullCapacityValidationErrors uses option labels and ignores available capacity',
  () => {
    assertEquals(
      buildFullCapacityValidationErrors({
        fieldKey: 'service',
        fieldLabel: 'Service',
        optionValues: ['morning', 'evening'],
        options: [
          { value: 'morning', label: 'Morning Service' },
          { value: 'evening', label: 'Evening Service' },
        ],
        maxSlotsByOption: { morning: 2, evening: 1 },
        usageByOption: { morning: 2, evening: 0 },
      }),
      [
        {
          fieldKey: 'service',
          message:
            'Service option "Morning Service" is already full. Please select another option.',
        },
      ],
    );
  },
);

Deno.test('selected-option extractors normalize live and stored answer representations', () => {
  assertEquals(extractSelectedOptionValues('select', ' morning '), ['morning']);
  assertEquals(extractSelectedOptionValues('multi_select', ['morning', ' morning ', null]), [
    'morning',
    'null',
  ]);
  assertEquals(extractSelectedOptionValues('multi_select_toggle', { morning: false }), ['morning']);
  assertEquals(
    extractSelectedOptionValuesFromStoredAnswer('multi_select', {
      answer_json: '["morning", " evening "]',
    }),
    ['morning', 'evening'],
  );
  assertEquals(
    extractSelectedOptionValuesFromStoredAnswer('multi_select_toggle', {
      answer_json: [{ morning: false, evening: true }],
    }),
    ['morning', 'evening'],
  );
});

Deno.test(
  'isFieldVisible evaluates scalar, array, toggle, missing-parent, and cyclic dependencies',
  () => {
    const parent = makeField({ field_key: 'service', field_type: 'select' });
    const scalarChild = makeField({
      field_key: 'notes',
      validation_rules: {
        visibility_rule: { depends_on_field_key: 'service', equals_value: 'morning' },
      },
    });
    assertEquals(
      isFieldVisible(scalarChild, [parent, scalarChild], { service: ' Morning ' }),
      true,
    );
    assertEquals(isFieldVisible(scalarChild, [parent, scalarChild], { service: 'evening' }), false);
    assertEquals(
      isFieldVisible(scalarChild, [parent, scalarChild], { service: ['evening', 'morning'] }),
      true,
    );

    const toggleChild = makeField({
      field_key: 'followup',
      validation_rules: {
        visibility_rule: { depends_on_field_key: 'service', equals_value: 'morning' },
      },
    });
    assertEquals(
      isFieldVisible(toggleChild, [parent, toggleChild], { service: { morning: false } }),
      false,
    );
    assertEquals(
      isFieldVisible(toggleChild, [parent, toggleChild], { service: { morning: true } }),
      true,
    );
    assertEquals(isFieldVisible(scalarChild, [parent, scalarChild], {}), false);

    const cyclicParent = makeField({
      field_key: 'parent',
      validation_rules: { visibility_rule: { depends_on_field_key: 'child', equals_value: 'yes' } },
    });
    const cyclicChild = makeField({
      field_key: 'child',
      validation_rules: {
        visibility_rule: { depends_on_field_key: 'parent', equals_value: 'yes' },
      },
    });
    assertEquals(
      isFieldVisible(cyclicParent, [cyclicParent, cyclicChild], { parent: 'yes', child: 'yes' }),
      false,
    );
  },
);

Deno.test('validateFieldValue handles required, typed, constrained, and hidden values', () => {
  assertEquals(
    validateFieldValue('name', 'x', makeField({ validation_rules: { min_length: 2 } })),
    { fieldKey: 'name', message: 'Field must be at least 2 characters.' },
  );
  assertEquals(
    validateFieldValue('email', 'invalid', makeField({ field_type: 'email', is_required: true })),
    { fieldKey: 'email', message: 'Field must be a valid email address.' },
  );
  assertEquals(validateFieldValue('count', '3', makeField({ field_type: 'number' })), null);
  assertEquals(
    validateFieldValue(
      'choice',
      'other',
      makeField({ field_type: 'select', options: [{ value: 'a', label: 'A' }] }),
    ),
    { fieldKey: 'choice', message: 'Field contains an unsupported option.' },
  );
  assertEquals(validateFieldValue('optional', '', makeField()), null);

  const controllingField = makeField({ field_key: 'show', field_type: 'boolean' });
  const hiddenField = makeField({
    field_key: 'detail',
    is_required: true,
    validation_rules: { visibility_rule: { depends_on_field_key: 'show', equals_value: 'yes' } },
  });
  assertEquals(
    validateFieldValue('detail', '', hiddenField, [controllingField, hiddenField], { show: 'no' }),
    null,
  );
});

Deno.test('validateFieldValue handles phone, boolean, multi-select, and date rules', () => {
  assertEquals(validateFieldValue('phone', 'letters-only', makeField({ field_type: 'phone' })), {
    fieldKey: 'phone',
    message: 'Field must be a valid phone number.',
  });
  assertEquals(validateFieldValue('consent', 'true', makeField({ field_type: 'boolean' })), null);
  assertEquals(
    validateFieldValue(
      'sessions',
      ['morning'],
      makeField({
        field_type: 'multi_select',
        options: [
          { value: 'morning', label: 'Morning' },
          { value: 'evening', label: 'Evening' },
        ],
        validation_rules: { min_selections: 2, max_selections: 2 },
      }),
    ),
    { fieldKey: 'sessions', message: 'Field requires at least 2 selection(s).' },
  );
  assertEquals(
    validateFieldValue(
      'service_date',
      '2026-09-30',
      makeField({ field_type: 'date', validation_rules: { allowed_weekdays: [3] } }),
    ),
    null,
  );
  assertEquals(
    validateFieldValue(
      'service_date',
      '2026-10-01',
      makeField({ field_type: 'date', validation_rules: { allowed_weekdays: [3] } }),
    ),
    { fieldKey: 'service_date', message: 'Field must fall on: Wednesday.' },
  );
});
