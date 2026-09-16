import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import { DuplicateEventDialog } from '../DuplicateEventDialog';

describe('DuplicateEventDialog', () => {
  const mockEvent = {
    id: 'evt-1',
    title: 'Original Event',
  } as AdminEvent;

  it('does not render when not open', () => {
    render(
      <DuplicateEventDialog
        isOpen={false}
        onClose={vi.fn()}
        event={mockEvent}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders and auto-generates slug from title', async () => {
    render(
      <DuplicateEventDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Duplicate Event' })).toBeInTheDocument();

    // Check initial title value
    const titleInput = screen.getByLabelText(/New Event Name/i);
    expect(titleInput).toHaveValue('Original Event (Copy)');

    // Slug should auto-generate
    const slugInput = screen.getByLabelText(/New Event Slug/i);
    await waitFor(() => {
      expect(slugInput).toHaveValue('original-event-copy');
    });

    // Change title and see if slug changes
    fireEvent.change(titleInput, { target: { value: 'My Awesome Duplicate' } });
    await waitFor(() => {
      expect(slugInput).toHaveValue('my-awesome-duplicate');
    });
  });

  it('calls onDuplicate with form values when submitted', async () => {
    const onDuplicateMock = vi.fn().mockResolvedValue(undefined);
    render(
      <DuplicateEventDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        isPending={false}
        onDuplicate={onDuplicateMock}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: 'Duplicate Event' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onDuplicateMock).toHaveBeenCalledWith(
        'evt-1',
        'Original Event (Copy)',
        'original-event-copy',
      );
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <DuplicateEventDialog
        isOpen={true}
        onClose={onCloseMock}
        event={mockEvent}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
