import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import { DuplicatePolicyLabel } from '../DuplicatePolicyLabel';
import { EventStatusBadge } from '../EventStatusBadge';
import { PublishActionButton } from '../PublishEventDialog';

const { mockGetPublishRequirements, mockAreAllRequirementsMet } = vi.hoisted(() => ({
  mockGetPublishRequirements: vi.fn(),
  mockAreAllRequirementsMet: vi.fn(),
}));

vi.mock('@/components/ui', () => ({
  Badge: ({ variant, children }: { variant: string; icon?: ReactNode; children: ReactNode }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {children}
    </span>
  ),
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

vi.mock('@/lib/domain/events', () => ({
  getPublishRequirements: (...args: unknown[]) => mockGetPublishRequirements(...args),
  areAllRequirementsMet: (...args: unknown[]) => mockAreAllRequirementsMet(...args),
}));

const event = { id: 'evt-1', title: 'Sample Event' } as unknown as AdminEvent;

describe('admin event mini-components', () => {
  it('renders duplicate policy label text for both policies', () => {
    const { rerender } = render(<DuplicatePolicyLabel policy="allow_update" />);
    expect(screen.getByText('Allow Update')).toBeInTheDocument();

    rerender(<DuplicatePolicyLabel policy="block" />);
    expect(screen.getByText('Block')).toBeInTheDocument();
  });

  it('renders status badge label and variant including fallback branch', () => {
    const { rerender } = render(<EventStatusBadge status="published" />);
    expect(screen.getByTestId('status-badge')).toHaveAttribute('data-variant', 'open');
    expect(screen.getByText('Published')).toBeInTheDocument();

    rerender(<EventStatusBadge status="archived" />);
    expect(screen.getByTestId('status-badge')).toHaveAttribute('data-variant', 'error');
    expect(screen.getByText('Archived')).toBeInTheDocument();

    rerender(<EventStatusBadge status={'unknown' as unknown as never} />);
    expect(screen.getByTestId('status-badge')).toHaveAttribute('data-variant', 'closed');
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows unmet publish requirements and disables confirm', () => {
    mockGetPublishRequirements.mockReturnValue([
      { key: 'title', label: 'Title', filled: true },
      { key: 'start', label: 'Start Date', filled: false },
    ]);
    mockAreAllRequirementsMet.mockReturnValue(false);

    render(<PublishActionButton event={event} isPending={false} onPublish={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByRole('heading', { name: 'Publish Event' })).toBeInTheDocument();
    expect(screen.getByText(/missing required fields/i)).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
    expect(screen.getByTestId('publish-confirm')).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByRole('button', { name: 'Publish Event' })).toBeDisabled();
  });

  it('confirms publish and sends selected event id/title when requirements are met', () => {
    mockGetPublishRequirements.mockReturnValue([{ key: 'title', label: 'Title', filled: true }]);
    mockAreAllRequirementsMet.mockReturnValue(true);

    const onPublish = vi.fn();
    render(<PublishActionButton event={event} isPending={false} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByRole('button', { name: 'Publish Event' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Publish Event' }));
    expect(onPublish).toHaveBeenCalledWith('evt-1', 'Sample Event');
  });

  it('cancels publish dialog without calling onPublish', () => {
    mockGetPublishRequirements.mockReturnValue([{ key: 'title', label: 'Title', filled: true }]);
    mockAreAllRequirementsMet.mockReturnValue(true);

    const onPublish = vi.fn();
    render(<PublishActionButton event={event} isPending={false} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onPublish).not.toHaveBeenCalled();
    expect(screen.queryByText('Publish Event')).not.toBeInTheDocument();
  });
});
