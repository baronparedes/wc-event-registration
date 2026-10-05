import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { renderFieldByType } from '@/components/fields/renderFieldByType';
import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

function TestHarness({ field }: { field: PublicEventField }) {
  const form = useForm<DynamicFieldResponseValues>();
  return <>{renderFieldByType(field.field_type, field, form)}</>;
}

describe('renderFieldByType', () => {
  it('renders rating field correctly via helper', () => {
    render(
      <TestHarness
        field={{
          id: 'test-rating',
          field_key: 'stars',
          label: 'Stars',
          field_type: 'rating',
          event_id: 'event-1',
          display_order: 1,
          applicability: 'both',
          is_active: true,
          is_required: false,
          placeholder: null,
          help_text: null,
          options: [],
          validation_rules: {},
        }}
      />,
    );

    expect(screen.getByRole('radiogroup', { name: 'Stars' })).toBeInTheDocument();
  });

  it('renders date field correctly via helper', () => {
    render(
      <TestHarness
        field={{
          id: 'test-date',
          field_key: 'date_input',
          label: 'Date',
          field_type: 'date',
          event_id: 'event-1',
          display_order: 1,
          applicability: 'both',
          is_active: true,
          is_required: false,
          placeholder: null,
          help_text: null,
          options: [],
          validation_rules: {},
        }}
      />,
    );

    expect(document.getElementById('field-date_input')).toBeInTheDocument();
  });
});
