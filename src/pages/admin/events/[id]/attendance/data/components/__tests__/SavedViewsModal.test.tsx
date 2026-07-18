import { faker } from '@faker-js/faker';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttendanceSavedView, AttendeeViewConfig } from '@/lib/domain/attendance-views';

import { SavedViewsModal } from '../SavedViewsModal';

const {
  mockNavigate,
  mockUseAttendanceSavedViewsQuery,
  mockUpsertMutate,
  mockUseUpsertMutation,
  mockDeleteMutate,
  mockUseDeleteMutation,
} = vi.hoisted(() => {
  const upsertMutate = vi.fn();
  const deleteMutate = vi.fn();
  return {
    mockNavigate: vi.fn(),
    mockUseAttendanceSavedViewsQuery: vi.fn(),
    mockUpsertMutate: upsertMutate,
    mockUseUpsertMutation: vi.fn(() => ({ mutate: upsertMutate, isPending: false })),
    mockDeleteMutate: deleteMutate,
    mockUseDeleteMutation: vi.fn(() => ({ mutate: deleteMutate, isPending: false })),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/domain/attendance', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance')>(
    '@/hooks/domain/attendance',
  );
  return {
    ...actual,
    useAttendanceSavedViewsQuery: (...args: unknown[]) => mockUseAttendanceSavedViewsQuery(...args),
    useUpsertAttendanceSavedViewMutation: () => mockUseUpsertMutation(),
    useDeleteAttendanceSavedViewMutation: () => mockUseDeleteMutation(),
  };
});

const defaultViewConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  dynamicFilters: [],
  groupBy: [],
};

function makeView(overrides: Partial<AttendanceSavedView> = {}): AttendanceSavedView {
  return {
    id: faker.string.uuid(),
    event_id: faker.string.uuid(),
    name: 'Test View',
    view_config: defaultViewConfig,
    created_at: '2026-07-19T00:00:00.000Z',
    updated_at: '2026-07-19T00:00:00.000Z',
    ...overrides,
  };
}

function renderModal(props: Partial<Parameters<typeof SavedViewsModal>[0]> = {}) {
  const defaults = {
    isOpen: true,
    onOpenChange: vi.fn(),
    eventId: faker.string.uuid(),
    currentViewConfig: defaultViewConfig,
    currentViewId: null,
    onApplyView: vi.fn(),
    onViewDeleted: vi.fn(),
  };
  return render(<SavedViewsModal {...defaults} {...props} />);
}

describe('SavedViewsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [] });
    mockUseUpsertMutation.mockReturnValue({ mutate: mockUpsertMutate, isPending: false });
    mockUseDeleteMutation.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Saved Views')).not.toBeInTheDocument();
  });

  it('shows empty state when no saved views', () => {
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [] });
    renderModal();
    expect(screen.getByText('No saved views yet.')).toBeInTheDocument();
  });

  it('renders saved view list when views exist', () => {
    const view = makeView({ name: 'My View' });
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [view] });

    renderModal();

    expect(screen.getByText('My View')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when Close is clicked', () => {
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('applies a view: calls onApplyView, onOpenChange, and navigates with viewId', () => {
    const view = makeView({ name: 'Apply Me' });
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [view] });

    const onApplyView = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ onApplyView, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApplyView).toHaveBeenCalledWith(view.view_config);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining(`viewId=${view.id}`),
      expect.objectContaining({ replace: true }),
    );
  });

  it('opens delete confirm when trash button is clicked', () => {
    const view = makeView({ name: 'To Delete' });
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [view] });

    renderModal();

    const trashButton = screen.getByRole('button', { name: '' }); // Trash2 icon-only button
    fireEvent.click(trashButton);

    expect(screen.getByText('Delete Saved View')).toBeInTheDocument();
  });

  it('deleting a non-selected view: closes modal but does not call onViewDeleted or remove viewId from URL', async () => {
    const selectedViewId = faker.string.uuid();
    const otherView = makeView({ id: faker.string.uuid(), name: 'Other View' });
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [otherView] });

    const onViewDeleted = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ currentViewId: selectedViewId, onViewDeleted, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: '' })); // open confirm

    mockDeleteMutate.mockImplementation((_payload: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onViewDeleted).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('deleting the selected view: calls onViewDeleted and removes viewId from URL', async () => {
    const selectedView = makeView({ name: 'Current View' });
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [selectedView] });

    const onViewDeleted = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ currentViewId: selectedView.id, onViewDeleted, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: '' })); // open confirm

    mockDeleteMutate.mockImplementation((_payload: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });

    await waitFor(() => {
      expect(onViewDeleted).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('opens save dialog when Save Current is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Current' }));

    expect(screen.getByText('Save Current View')).toBeInTheDocument();
    expect(screen.getByLabelText('View Name')).toBeInTheDocument();
  });

  it('save dialog: Cancel clears name and closes dialog', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Current' }));

    fireEvent.change(screen.getByLabelText('View Name'), { target: { value: 'My View' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Save Current View')).not.toBeInTheDocument();
    });
  });

  it('save dialog: backdrop click closes the dialog via onClose', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Current' }));
    expect(screen.getByText('Save Current View')).toBeInTheDocument();

    // Click the backdrop (last fixed div — the save dialog sits on top of the main modal)
    const backdrops = document.querySelectorAll('.fixed.inset-0.z-50');
    fireEvent.click(backdrops[backdrops.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Save Current View')).not.toBeInTheDocument();
    });
  });

  it('delete confirm dialog: Cancel closes confirm and does not delete', async () => {
    const view = makeView({ name: 'View To Keep' });
    mockUseAttendanceSavedViewsQuery.mockReturnValue({ data: [view] });

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: '' })); // open confirm
    expect(screen.getByText('Delete Saved View')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Delete Saved View')).not.toBeInTheDocument();
    });
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('save dialog: Save View button is disabled when name is empty', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Current' }));

    expect(screen.getByRole('button', { name: 'Save View' })).toBeDisabled();
  });

  it('save dialog: submits with name and navigates with new viewId on success', async () => {
    const eventId = faker.string.uuid();
    const newViewId = faker.string.uuid();
    const onApplyView = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ eventId, onApplyView, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Save Current' }));
    fireEvent.change(screen.getByLabelText('View Name'), { target: { value: 'New View' } });

    mockUpsertMutate.mockImplementation(
      (_payload: unknown, opts: { onSuccess: (result: { id: string }) => void }) => {
        opts.onSuccess({ id: newViewId });
      },
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save View' }));
    });

    await waitFor(() => {
      expect(mockUpsertMutate).toHaveBeenCalledWith(
        expect.objectContaining({ event_id: eventId, name: 'New View' }),
        expect.any(Object),
      );
      expect(onApplyView).toHaveBeenCalledWith(defaultViewConfig);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`viewId=${newViewId}`),
        expect.objectContaining({ replace: true }),
      );
    });
  });
});
