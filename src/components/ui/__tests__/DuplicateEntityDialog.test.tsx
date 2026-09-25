import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DuplicateEntityDialog } from '../DuplicateEntityDialog';

describe('DuplicateEntityDialog', () => {
  const mockItem = { id: 'evt-123', title: 'Sunday Worship' };

  it('renders modal when open and sets initial copy title and slug', () => {
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

    expect(screen.getByRole('heading', { name: 'Duplicate Event' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sunday Worship (Copy)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sunday-worship-copy')).toBeInTheDocument();
  });

  it('auto-generates slug when title is updated', async () => {
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

    const titleInput = screen.getByLabelText(/new form name/i);
    fireEvent.change(titleInput, { target: { value: 'Annual Volunteer Survey 2026' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/new form slug/i)).toHaveValue('annual-volunteer-survey-2026');
    });
  });

  it('submits form with modified values', async () => {
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

    const submitBtn = screen.getByRole('button', { name: 'Duplicate Event' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith(
        'evt-123',
        'Sunday Worship (Copy)',
        'sunday-worship-copy',
      );
    });
  });

  it('calls onClose when cancel button is clicked', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
