import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

import { RatingFieldRenderer } from '../RatingFieldRenderer';

function buildField(overrides?: Partial<PublicEventField>): PublicEventField {
  return {
    id: 'field-rating',
    event_id: 'event-1',
    field_key: 'feedback_rating',
    label: 'Rate your experience',
    field_type: 'rating',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
    applicability: 'both',
    ...overrides,
  };
}

function Harness({
  field,
  defaultValues = {},
}: {
  field: PublicEventField;
  defaultValues?: DynamicFieldResponseValues;
}) {
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues,
  });

  return <RatingFieldRenderer field={field} dynamicForm={dynamicForm} />;
}

describe('RatingFieldRenderer', () => {
  it('renders 5 stars by default with accessible radiogroup semantics', () => {
    render(<Harness field={buildField()} />);

    const radiogroup = screen.getByRole('radiogroup', { name: 'Rate your experience' });
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole('radio', { hidden: true });
    expect(radios).toHaveLength(5);
    expect(screen.getByTitle('5 of 5 stars')).toBeInTheDocument();
  });

  it('renders custom number of stars based on validation_rules.max', () => {
    render(<Harness field={buildField({ validation_rules: { max: 8 } })} />);

    const radios = screen.getAllByRole('radio', { hidden: true });
    expect(radios).toHaveLength(8);
    expect(screen.getByTitle('8 of 8 stars')).toBeInTheDocument();
  });

  it('allows clicking a star to select a rating', async () => {
    const user = userEvent.setup();
    render(<Harness field={buildField()} />);

    const thirdStar = screen.getByTitle('3 of 5 stars');
    await user.click(thirdStar);

    const radios = screen.getAllByRole('radio', { hidden: true }) as HTMLInputElement[];
    expect(radios[2].checked).toBe(true);
  });

  it('allows clicking the selected star again to deselect for optional ratings', async () => {
    const user = userEvent.setup();
    render(<Harness field={buildField()} defaultValues={{ feedback_rating: 4 }} />);

    const fourthStar = screen.getByTitle('4 of 5 stars');
    await user.click(fourthStar);

    const radios = screen.getAllByRole('radio', { hidden: true }) as HTMLInputElement[];
    expect(radios.some((r) => r.checked)).toBe(false);
  });

  it('updates hover state when mouse enters and leaves stars', () => {
    render(<Harness field={buildField()} />);

    const fourthStar = screen.getByTitle('4 of 5 stars');
    fireEvent.mouseEnter(fourthStar);

    // SVGs inside labels 1 to 4 should be filled
    const labels = [
      screen.getByTitle('1 of 5 stars'),
      screen.getByTitle('2 of 5 stars'),
      screen.getByTitle('3 of 5 stars'),
      screen.getByTitle('4 of 5 stars'),
    ];
    for (const label of labels) {
      const svg = label.querySelector('svg');
      expect(svg).toHaveClass('fill-amber-400');
    }

    const radiogroup = screen.getByRole('radiogroup');
    fireEvent.mouseLeave(radiogroup);
  });
});
