import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { MobileFormCard } from '../MobileFormCard';

const mockForm: AdminForm = {
  id: 'form-123',
  title: 'Test Form',
  slug: 'test-form',
  description: 'Test description',
  status: 'published',
  duplicate_policy: 'block',
  audience: 'members',
  metadata: {},
  created_at: '2026-09-10T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z',
  created_by_admin_id: 'user-1',
};

function renderComponent(props: Partial<React.ComponentProps<typeof MobileFormCard>> = {}) {
  const defaultProps = {
    form: mockForm,
    canWrite: true,
    canRead: true,
  };

  return render(
    <MemoryRouter>
      <MobileFormCard {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe('MobileFormCard', () => {
  it('renders form details correctly', () => {
    renderComponent();

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('test-form')).toBeInTheDocument();
    expect(screen.getByText('members')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument(); // FormStatusBadge
  });

  it('renders action links based on permissions', () => {
    const { rerender } = renderComponent({ canWrite: true, canRead: true });

    expect(screen.getByRole('link', { name: 'Edit Test Form' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View submissions for Test Form' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions for Test Form' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <MobileFormCard form={mockForm} canWrite={false} canRead={true} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Edit Test Form' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View submissions for Test Form' }),
    ).toBeInTheDocument();
  });

  it('opens dropdown menu for additional actions', () => {
    renderComponent({ canWrite: true, canRead: true });

    const moreButton = screen.getByRole('button', { name: 'More actions for Test Form' });
    fireEvent.click(moreButton);

    expect(screen.getByRole('link', { name: /Form fields/i })).toBeInTheDocument();
  });
});
