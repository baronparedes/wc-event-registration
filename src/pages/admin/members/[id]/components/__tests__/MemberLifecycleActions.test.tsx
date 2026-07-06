import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberLifecycleActions } from '../MemberLifecycleActions';

describe('MemberLifecycleActions', () => {
  const onDeleteMember = vi.fn<() => Promise<void>>();
  const onRestoreMember = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    vi.clearAllMocks();
    onDeleteMember.mockResolvedValue(undefined);
    onRestoreMember.mockResolvedValue(undefined);
  });

  it('shows delete action for active member and confirms delete', async () => {
    render(
      <MemberLifecycleActions
        isDeletedMember={false}
        memberFullName="Jane Doe"
        isDeleting={false}
        isRestoring={false}
        onDeleteMember={onDeleteMember}
        onRestoreMember={onRestoreMember}
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete Member' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore Member' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Member' }));
    expect(screen.getByRole('heading', { name: 'Delete Member' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDeleteMember).toHaveBeenCalledTimes(1);
  });

  it('shows restore action for deleted member and confirms restore', () => {
    render(
      <MemberLifecycleActions
        isDeletedMember={true}
        memberFullName="Jane Doe"
        isDeleting={false}
        isRestoring={false}
        onDeleteMember={onDeleteMember}
        onRestoreMember={onRestoreMember}
      />,
    );

    expect(screen.getByRole('button', { name: 'Restore Member' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Member' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Member' }));
    expect(screen.getByRole('heading', { name: 'Restore Member' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(onRestoreMember).toHaveBeenCalledTimes(1);
  });

  it('closes delete dialog when cancel is clicked', () => {
    render(
      <MemberLifecycleActions
        isDeletedMember={false}
        memberFullName="Jane Doe"
        isDeleting={false}
        isRestoring={false}
        onDeleteMember={onDeleteMember}
        onRestoreMember={onRestoreMember}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Member' }));
    expect(screen.getByRole('heading', { name: 'Delete Member' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Delete Member' })).not.toBeInTheDocument();
    expect(onDeleteMember).not.toHaveBeenCalled();
  });

  it('closes restore dialog when cancel is clicked', () => {
    render(
      <MemberLifecycleActions
        isDeletedMember={true}
        memberFullName="Jane Doe"
        isDeleting={false}
        isRestoring={false}
        onDeleteMember={onDeleteMember}
        onRestoreMember={onRestoreMember}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore Member' }));
    expect(screen.getByRole('heading', { name: 'Restore Member' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Restore Member' })).not.toBeInTheDocument();
    expect(onRestoreMember).not.toHaveBeenCalled();
  });

  it('disables action button while delete is pending', () => {
    render(
      <MemberLifecycleActions
        isDeletedMember={false}
        memberFullName="Jane Doe"
        isDeleting={true}
        isRestoring={false}
        onDeleteMember={onDeleteMember}
        onRestoreMember={onRestoreMember}
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete Member' })).toBeDisabled();
  });

  it('disables action button while restore is pending', () => {
    render(
      <MemberLifecycleActions
        isDeletedMember={true}
        memberFullName="Jane Doe"
        isDeleting={false}
        isRestoring={true}
        onDeleteMember={onDeleteMember}
        onRestoreMember={onRestoreMember}
      />,
    );

    expect(screen.getByRole('button', { name: 'Restore Member' })).toBeDisabled();
  });
});
