import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SaveConfirmationDialog } from '@/pages/admin/events/_event-form/components/SaveConfirmationDialog';

type ReactNode = import('react').ReactNode;

const { mockConfirmDialog } = vi.hoisted(() => ({
  mockConfirmDialog: vi.fn(),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: (props: Record<string, unknown>) => {
    mockConfirmDialog(props);
    return <div>Confirm Dialog</div>;
  },
}));

describe('SaveConfirmationDialog', () => {
  it('returns null when closed or no fields changed', () => {
    const { rerender } = render(
      <SaveConfirmationDialog
        isOpen={false}
        changedFieldNames={['title']}
        isPending={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText('Confirm Dialog')).not.toBeInTheDocument();

    rerender(
      <SaveConfirmationDialog
        isOpen
        changedFieldNames={[]}
        isPending={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText('Confirm Dialog')).not.toBeInTheDocument();
  });

  it('maps changed fields to readable labels and forwards dialog props', () => {
    render(
      <SaveConfirmationDialog
        isOpen
        changedFieldNames={['title', 'registration_mode']}
        isPending
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Confirm Dialog')).toBeInTheDocument();
    const lastCall = mockConfirmDialog.mock.calls.at(-1)?.[0] as {
      title: string;
      confirmLabel: string;
      confirmLoadingLabel: string;
      isPending: boolean;
      description: ReactNode;
    };

    expect(lastCall.title).toBe('Review Changes');
    expect(lastCall.confirmLabel).toBe('Save Changes');
    expect(lastCall.confirmLoadingLabel).toBe('Saving...');
    expect(lastCall.isPending).toBe(true);

    render(<>{lastCall.description}</>);
    expect(screen.getByText("You're updating the following fields:")).toBeInTheDocument();
    expect(screen.getByText('Event Title')).toBeInTheDocument();
    expect(screen.getByText('Registration Status')).toBeInTheDocument();
  });
});
