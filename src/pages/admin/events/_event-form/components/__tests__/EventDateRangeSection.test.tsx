import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { CreateEventInput } from '@/lib/domain/events';
import { EventDateRangeSection } from '@/pages/admin/events/_event-form/components/EventDateRangeSection';

function Harness(props: { errors?: FieldErrors<CreateEventInput>; disabled?: boolean }) {
  const { register } = useForm<CreateEventInput>();

  return (
    <EventDateRangeSection
      title="Event Schedule"
      startName="starts_at"
      startLabel="Event Start"
      startId="event-starts-at"
      endName="ends_at"
      endLabel="Event End"
      endId="event-ends-at"
      errors={props.errors ?? {}}
      register={register}
      disabled={props.disabled}
    />
  );
}

describe('EventDateRangeSection', () => {
  it('renders datetime inputs and supports disabled mode', () => {
    render(<Harness disabled />);

    expect(screen.getByLabelText('Event Start')).toBeDisabled();
    expect(screen.getByLabelText('Event End')).toBeDisabled();
  });

  it('shows only string validation errors from react-hook-form', () => {
    const errors = {
      starts_at: { message: 'Event start is required' },
      ends_at: { message: { nested: 'not-a-string' } },
    } as unknown as FieldErrors<CreateEventInput>;

    render(<Harness errors={errors} />);

    expect(screen.getByText('Event start is required')).toBeInTheDocument();
    expect(screen.queryByText('not-a-string')).not.toBeInTheDocument();
  });
});
