import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminEventFormPage } from '@/pages/admin/events/_event-form';

const {
  mockNavigate,
  mockUseParams,
  mockUseAdminEventQuery,
  mockCreateMutateAsync,
  mockUpdateMutateAsync,
  mockPublishMutateAsync,
  mockArchiveMutateAsync,
  mockRestoreToDraftMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockCreateMutateAsync: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockPublishMutateAsync: vi.fn(),
  mockArchiveMutateAsync: vi.fn(),
  mockRestoreToDraftMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events');

  return {
    ...actual,
    useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
    useCreateEventMutation: () => ({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    }),
    useUpdateEventMutation: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
    usePublishEventMutation: () => ({
      mutateAsync: mockPublishMutateAsync,
      isPending: false,
    }),
    useArchiveEventMutation: () => ({
      mutateAsync: mockArchiveMutateAsync,
      isPending: false,
    }),
    useRestoreEventToDraftMutation: () => ({
      mutateAsync: mockRestoreToDraftMutateAsync,
      isPending: false,
    }),
  };
});

function renderWithRouter(mode: 'create' | 'edit') {
  return render(
    <MemoryRouter>
      <AdminEventFormPage mode={mode} />
    </MemoryRouter>,
  );
}

describe('AdminEventFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'event-1' });
    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Original Event',
        slug: 'original-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    });
    mockUpdateMutateAsync.mockResolvedValue(undefined);
    mockCreateMutateAsync.mockResolvedValue(undefined);
    mockPublishMutateAsync.mockResolvedValue(undefined);
    mockArchiveMutateAsync.mockResolvedValue(undefined);
    mockRestoreToDraftMutateAsync.mockResolvedValue(undefined);
  });

  it('renders loading and not-found states for edit mode', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { rerender } = renderWithRouter('edit');
    expect(screen.getByText('Loading event...')).toBeInTheDocument();

    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });

    rerender(
      <MemoryRouter>
        <AdminEventFormPage mode="edit" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Event not found.')).toBeInTheDocument();
  });

  it('submits create mode successfully', async () => {
    renderWithRouter('create');

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Brand New Event' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Brand New Event',
          slug: 'brand-new-event',
          status: 'draft',
          duplicate_policy: 'block',
          registration_mode: 'open',
        }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Event created successfully.');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/events');
  });

  it('shows save confirmation for published events before mutating', async () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Published Event',
        slug: 'published-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'published',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    });

    renderWithRouter('edit');

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Published Event Updated' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByText('Review Changes')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Save Changes' })[1]);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          title: 'Published Event Updated',
        }),
      );
    });
  });

  it('renders archived edit mode as read-only with Back to Events action', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Archived Event',
        slug: 'archived-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'archived',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    });

    renderWithRouter('edit');

    expect(screen.getByText(/This event is archived and cannot be edited/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Events' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
  });

  it('shows event breadcrumb context in edit mode', () => {
    renderWithRouter('edit');

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/admin/events');
    expect(screen.getByRole('heading', { level: 1, name: 'Manage Event' })).toBeInTheDocument();
  });

  it('shows error toast when save fails', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error('save failed'));

    renderWithRouter('edit');

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Updated Event Title' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('save failed');
    });
  });

  it('keeps Save Changes disabled until the edit form becomes dirty, then submits', async () => {
    renderWithRouter('edit');

    const saveButton = await screen.findByRole('button', { name: 'Save Changes' });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Updated Event Title' },
    });

    await waitFor(() => {
      expect(saveButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          title: 'Updated Event Title',
          slug: 'original-event',
          description: 'Existing description',
          location: 'Main Hall',
          starts_at: '2026-07-01T18:00',
          ends_at: '2026-07-01T20:00',
          registration_opens_at: '2026-06-01T18:00',
          registration_closes_at: '2026-06-30T18:00',
          status: 'draft',
          duplicate_policy: 'block',
          registration_mode: 'open',
        }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Event updated successfully.');
    expect(mockNavigate).toHaveBeenCalledWith('/admin/events');
  });

  it('shows Publish action in edit mode for draft events and publishes successfully', async () => {
    renderWithRouter('edit');

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('heading', { name: 'Publish Event' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publish Event' }));

    await waitFor(() => {
      expect(mockPublishMutateAsync).toHaveBeenCalledWith('event-1');
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('"Original Event" has been published.');
  });

  it('shows Archive action in edit mode and archives successfully', async () => {
    renderWithRouter('edit');

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Archive' }))[1]);

    await waitFor(() => {
      expect(mockArchiveMutateAsync).toHaveBeenCalledWith('event-1');
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('"Original Event" has been archived.');
  });

  it('hides Publish action for published and archived events', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Published Event',
        slug: 'published-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'published',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    });

    const { rerender } = renderWithRouter('edit');
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();

    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Archived Event',
        slug: 'archived-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'archived',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    });

    rerender(
      <MemoryRouter>
        <AdminEventFormPage mode="edit" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to Draft' })).toBeInTheDocument();
  });

  it('moves archived event back to draft', async () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: 'event-1',
        title: 'Archived Event',
        slug: 'archived-event',
        description: 'Existing description',
        location: 'Main Hall',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-01T12:00:00.000Z',
        registration_opens_at: '2026-06-01T10:00:00.000Z',
        registration_closes_at: '2026-06-30T10:00:00.000Z',
        status: 'archived',
        duplicate_policy: 'block',
        registration_mode: 'open',
      },
      isLoading: false,
    });

    renderWithRouter('edit');

    fireEvent.click(screen.getByRole('button', { name: 'Move to Draft' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Move to Draft' }))[1]);

    await waitFor(() => {
      expect(mockRestoreToDraftMutateAsync).toHaveBeenCalledWith('event-1');
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('"Archived Event" has been moved to draft.');
  });
});
