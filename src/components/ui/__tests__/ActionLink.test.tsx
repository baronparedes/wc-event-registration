import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ActionButton, ActionLink } from '@/components/ui/ActionLink';

describe('ActionLink', () => {
  it('renders link with default variant classes', () => {
    render(
      <MemoryRouter>
        <ActionLink to="/admin/events">Open</ActionLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Open' });
    expect(link).toHaveClass('text-primary');
    expect(link).toHaveClass('underline-offset-2');
    expect(link).toHaveAttribute('href', '/admin/events');
  });

  it('renders destructive variant and custom class', () => {
    render(
      <MemoryRouter>
        <ActionLink to="/admin/events" variant="destructive" className="extra-class">
          Delete
        </ActionLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Delete' });
    expect(link).toHaveClass('text-red-600');
    expect(link).toHaveClass('extra-class');
  });
});

describe('ActionButton', () => {
  it('renders default variant classes and handles clicks', () => {
    const onClick = vi.fn();

    render(<ActionButton onClick={onClick}>Edit</ActionButton>);

    const button = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(button);

    expect(button).toHaveClass('text-primary');
    expect(button).toHaveClass('hover:underline');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders destructive variant and custom class', () => {
    render(
      <ActionButton variant="destructive" className="my-action">
        Remove
      </ActionButton>,
    );

    const button = screen.getByRole('button', { name: 'Remove' });
    expect(button).toHaveClass('text-red-600');
    expect(button).toHaveClass('my-action');
  });
});
