import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { RatingFieldRenderer } from '@/components/fields/RatingFieldRenderer';
import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

function TestHarness({
  field,
  defaultValue = 0,
}: {
  field: DynamicFieldLike;
  defaultValue?: number;
}) {
  const form = useForm<DynamicFieldResponseValues>({
    defaultValues: { [field.field_key]: defaultValue },
  });

  return <RatingFieldRenderer field={field} dynamicForm={form} />;
}

describe('RatingFieldRenderer', () => {
  const baseField: DynamicFieldLike = {
    id: 'field-rating-1',
    field_key: 'event_rating',
    label: 'Rate your experience',
    field_type: 'rating',
    is_required: false,
  };

  it('renders default 5 stars when no max validation rule is provided', () => {
    render(<TestHarness field={baseField} />);

    expect(screen.getByRole('radiogroup', { name: 'Rate your experience' })).toBeInTheDocument();
    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(5);
  });

  it('renders custom number of stars based on validation_rules.max', () => {
    render(
      <TestHarness
        field={{
          ...baseField,
          validation_rules: { max: 7 },
        }}
      />,
    );

    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(7);
  });

  it('caps max stars between 1 and 10', () => {
    render(
      <TestHarness
        field={{
          ...baseField,
          validation_rules: { max: 15 },
        }}
      />,
    );

    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(10);
  });

  it('updates form rating value on star click', () => {
    render(<TestHarness field={baseField} />);

    const star3 = screen.getByRole('radio', { name: /3 of 5 stars/i });
    fireEvent.click(star3);

    expect(star3).toBeChecked();
  });

  it('handles mouse hover preview state on stars and mouse leave', () => {
    render(<TestHarness field={baseField} defaultValue={1} />);

    const group = screen.getByRole('radiogroup');
    const label4 = screen.getByTitle('4 of 5 stars');

    fireEvent.mouseEnter(label4);
    fireEvent.mouseLeave(group);

    const star1 = screen.getByRole('radio', { name: /1 of 5 stars/i });
    expect(star1).toBeChecked();
  });

  it('unselects rating when clicking the currently active star label', () => {
    render(<TestHarness field={baseField} defaultValue={4} />);

    const label4 = screen.getByTitle('4 of 5 stars');
    fireEvent.click(label4);

    const star4 = screen.getByRole('radio', { name: /4 of 5 stars/i });
    expect(star4).not.toBeChecked();
  });
});
