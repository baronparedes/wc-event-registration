import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { AdminFormsTable } from '../AdminFormsTable';

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

function renderComponent(props: Partial<React.ComponentProps<typeof AdminFormsTable>> = {}) {
  const defaultProps = {
    forms: [mockForm],
    canWrite: true,
    canRead: true,
    onFormSelect: vi.fn(),
  };

  return render(
    <MemoryRouter>
      <AdminFormsTable {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe('AdminFormsTable', () => {
  it('renders form details correctly', () => {
    renderComponent();

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('test-form')).toBeInTheDocument();
    expect(screen.getByText('members')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument(); // FormStatusBadge
  });

  it('calls onFormSelect when a row is clicked and canWrite is true', () => {
    const onFormSelect = vi.fn();
    renderComponent({ onFormSelect, canWrite: true });

    // The row contains the title, click it
    const rowContent = screen.getByText('Test Form');
    fireEvent.click(rowContent);

    expect(onFormSelect).toHaveBeenCalledWith('form-123');
  });

  it('does not call onFormSelect when row is clicked if canWrite is false', () => {
    const onFormSelect = vi.fn();
    renderComponent({ onFormSelect, canWrite: false });

    const rowContent = screen.getByText('Test Form');
    fireEvent.click(rowContent);

    expect(onFormSelect).not.toHaveBeenCalled();
  });

  it('renders action links based on permissions', () => {
    const { rerender } = renderComponent({ canWrite: true, canRead: true });

    expect(screen.getByRole('link', { name: 'Edit Form' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Form Fields' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submissions' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AdminFormsTable
          forms={[mockForm]}
          canWrite={false}
          canRead={true}
          onFormSelect={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Edit Form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Form Fields' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submissions' })).toBeInTheDocument();
  });
});
