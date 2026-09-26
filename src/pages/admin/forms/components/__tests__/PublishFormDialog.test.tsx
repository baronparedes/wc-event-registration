import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { PublishFormActionButton } from '../PublishFormDialog';

const { mockGetFormPublishRequirements, mockAreAllFormRequirementsMet } = vi.hoisted(() => ({
  mockGetFormPublishRequirements: vi.fn(),
  mockAreAllFormRequirementsMet: vi.fn(),
}));

vi.mock('@/components/ui/ActionLink', () => ({
  ActionButton: ({
    children,
    onClick,
  }: {
    variant: string;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    description,
    confirmLabel,
    confirmVariant,
    onConfirm,
    onCancel,
    disabled,
  }: {
    isOpen: boolean;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    confirmVariant: string;
    isPending: boolean;
    confirmLoadingLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    disabled?: boolean;
  }) => {
    if (!isOpen) return null;

    return (
      <div>
        <h2>{title}</h2>
        <div>{description}</div>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          data-testid="publish-confirm"
          data-variant={confirmVariant}
          onClick={onConfirm}
          disabled={disabled}
        >
          {confirmLabel}
        </button>
      </div>
    );
  },
}));

vi.mock('@/lib/domain/forms', () => ({
  getFormPublishRequirements: (...args: unknown[]) => mockGetFormPublishRequirements(...args),
  areAllFormRequirementsMet: (...args: unknown[]) => mockAreAllFormRequirementsMet(...args),
}));

const form = {
  id: 'form-1',
  title: 'Sample Form',
  slug: 'sample-form',
} as unknown as AdminForm;

describe('PublishFormDialog', () => {
  it('shows unmet publish requirements and disables confirm', () => {
    mockGetFormPublishRequirements.mockReturnValue([
      { key: 'title', label: 'Form Title', filled: true },
      { key: 'slug', label: 'Form Slug', filled: true },
      { key: 'fields', label: 'At least 1 Dynamic Field', filled: false },
    ]);
    mockAreAllFormRequirementsMet.mockReturnValue(false);

    render(
      <PublishFormActionButton form={form} fieldsCount={0} isPending={false} onPublish={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByRole('heading', { name: 'Publish Form' })).toBeInTheDocument();
    expect(screen.getByText(/missing required fields/i)).toBeInTheDocument();
    expect(screen.getAllByText('✓')).toHaveLength(2);
    expect(screen.getByText('✗')).toBeInTheDocument();
    expect(screen.getByTestId('publish-confirm')).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByTestId('publish-confirm')).toBeDisabled();
  });

  it('confirms publish and sends selected form id/title when requirements are met', () => {
    mockGetFormPublishRequirements.mockReturnValue([
      { key: 'title', label: 'Form Title', filled: true },
      { key: 'slug', label: 'Form Slug', filled: true },
      { key: 'fields', label: 'At least 1 Dynamic Field', filled: true },
    ]);
    mockAreAllFormRequirementsMet.mockReturnValue(true);

    const onPublish = vi.fn();
    render(
      <PublishFormActionButton
        form={form}
        fieldsCount={2}
        isPending={false}
        onPublish={onPublish}
        triggerStyle="button"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish Form' }));
    expect(screen.getByTestId('publish-confirm')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('publish-confirm'));
    expect(onPublish).toHaveBeenCalledWith('form-1', 'Sample Form');
  });

  it('cancels publish dialog without calling onPublish', () => {
    mockGetFormPublishRequirements.mockReturnValue([
      { key: 'title', label: 'Form Title', filled: true },
      { key: 'slug', label: 'Form Slug', filled: true },
      { key: 'fields', label: 'At least 1 Dynamic Field', filled: true },
    ]);
    mockAreAllFormRequirementsMet.mockReturnValue(true);

    const onPublish = vi.fn();
    render(
      <PublishFormActionButton
        form={form}
        fieldsCount={1}
        isPending={false}
        onPublish={onPublish}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onPublish).not.toHaveBeenCalled();
    expect(screen.queryByText('Publish Form')).not.toBeInTheDocument();
  });
});
