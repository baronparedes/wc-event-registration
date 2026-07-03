import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { CreateEventInput } from '@/lib/domain/events';
import { EventDetailsSection } from '@/pages/admin/events/_event-form/components/EventDetailsSection';

function Harness(props: {
  isEditMode: boolean;
  errors?: FieldErrors<CreateEventInput>;
  disabled?: boolean;
}) {
  const { register } = useForm<CreateEventInput>();

  return (
    <EventDetailsSection
      isEditMode={props.isEditMode}
      slugValue="sample-event"
      errors={props.errors ?? {}}
      register={register}
      onSlugChange={vi.fn()}
      disabled={props.disabled}
    />
  );
}

describe('EventDetailsSection', () => {
  it('renders editable slug helper text in create mode and disabled controls', () => {
    render(<Harness isEditMode={false} disabled />);

    expect(
      screen.getByText(
        'Auto-generated from title. Use only lowercase letters, numbers, and hyphens.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title *')).toBeDisabled();
    expect(screen.getByLabelText('Slug')).toBeDisabled();
  });

  it('renders only string title errors and supports edit mode helper text', () => {
    const errors = {
      title: { message: 'Title is required' },
      slug: { message: 'Slug is required' },
    } as unknown as FieldErrors<CreateEventInput>;

    render(<Harness isEditMode errors={errors} />);

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Slug cannot be changed after creation to preserve existing registration links.',
      ),
    ).toBeInTheDocument();
  });

  it('ignores non-string title error payloads', () => {
    const errors = {
      title: { message: { key: 'invalid' } },
    } as unknown as FieldErrors<CreateEventInput>;

    render(<Harness isEditMode={false} errors={errors} />);

    expect(screen.queryByText('invalid')).not.toBeInTheDocument();
  });
});
