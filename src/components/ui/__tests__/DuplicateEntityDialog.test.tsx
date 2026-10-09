import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DuplicateEntityDialog } from '../DuplicateEntityDialog';

describe('DuplicateEntityDialog', () => {
  const mockItem = { id: 'evt-123', title: 'Sunday Worship' };

  it('renders modal when open and sets initial copy title and slug', async () => {
    render(
      <DuplicateEntityDialog
        isOpen={true}
        onClose={vi.fn()}
        entityType="Event"
        sourceItem={mockItem}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Duplicate Event' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sunday Worship (Copy)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sunday-worship-copy')).toBeInTheDocument();
  });

  it('auto-generates slug when title is updated', async () => {
    const user = userEvent.setup();
    render(
      <DuplicateEntityDialog
        isOpen={true}
        onClose={vi.fn()}
        entityType="Form"
        sourceItem={{ id: 'form-1', title: 'Survey' }}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    const titleInput = await screen.findByLabelText(/new form name/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Annual Volunteer Survey 2026');

    await waitFor(() => {
      expect(screen.getByLabelText(/new form slug/i)).toHaveValue('annual-volunteer-survey-2026');
    });
  });

  it('submits form with modified values', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn().mockResolvedValue(undefined);

    render(
      <DuplicateEntityDialog
        isOpen={true}
        onClose={vi.fn()}
        entityType="Event"
        sourceItem={mockItem}
        isPending={false}
        onDuplicate={onDuplicate}
      />,
    );

    const submitBtn = await screen.findByRole('button', { name: 'Duplicate Event' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith(
        'evt-123',
        'Sunday Worship (Copy)',
        'sunday-worship-copy',
      );
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DuplicateEntityDialog
        isOpen={true}
        onClose={onClose}
        entityType="Event"
        sourceItem={mockItem}
        isPending={false}
        onDuplicate={vi.fn()}
      />,
    );

    const cancelBtn = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
