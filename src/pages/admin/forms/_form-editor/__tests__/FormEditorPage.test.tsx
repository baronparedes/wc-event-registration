import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import { FormEditorPage } from '@/pages/admin/forms/_form-editor';

const {
  mockNavigate,
  mockUseParams,
  mockUseAdminFormQuery,
  mockSaveFormMutateAsync,
  mockUseAdminAuthQuery,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseAdminFormQuery: vi.fn(),
  mockSaveFormMutateAsync: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

vi.mock('@/hooks/domain/forms', () => ({
  useAdminFormQuery: (id?: string) => mockUseAdminFormQuery(id),
  useSaveFormMutation: () => ({
    mutateAsync: mockSaveFormMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <FormEditorPage />
    </MemoryRouter>,
  );
}

describe('FormEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseAdminFormQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseAdminAuthQuery.mockReturnValue({
      data: {
        adminRole: 'super_admin',
      },
    });
  });

  it('renders create mode with full-page layout and right-aligned buttons', () => {
    const { container } = renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Create New Form' })).toBeInTheDocument();

    // Verify the form is full page (no max-w-2xl constraint)
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    expect(form).not.toHaveClass('max-w-2xl');
    expect(form).toHaveClass('space-y-6');

    // Verify action buttons container is right-aligned
    const actionsContainer = screen.getByRole('button', {
      name: 'Next: Manage Fields',
    }).parentElement;
    expect(actionsContainer).toHaveClass('justify-end');

    // Verify Cancel button precedes submit button and has expected styles
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const nextButton = screen.getByRole('button', { name: 'Next: Manage Fields' });
    expect(actionsContainer?.children[0]).toBe(cancelButton);
    expect(actionsContainer?.children[1]).toBe(nextButton);
  });

  it('navigates to admin forms when Cancel is clicked', () => {
    renderPage();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.adminForms);
  });

  it('auto-generates slug from title in create mode and allows manual editing', async () => {
    renderPage();

    const titleInput = screen.getByPlaceholderText('e.g. Area Reservation Form');
    const slugInput = screen.getByPlaceholderText('e.g. summer-event-2025');

    // Auto-generate from title
    fireEvent.change(titleInput, { target: { value: 'Annual Youth Camp' } });
    await waitFor(() => {
      expect(slugInput).toHaveValue('annual-youth-camp');
    });

    // Manual edit overrides auto-generation
    fireEvent.change(slugInput, { target: { value: 'custom-youth-camp-2026' } });
    await waitFor(() => {
      expect(slugInput).toHaveValue('custom-youth-camp-2026');
    });

    // Further title updates should not overwrite the manual edit
    fireEvent.change(titleInput, { target: { value: 'Updated Youth Camp Title' } });
    expect(slugInput).toHaveValue('custom-youth-camp-2026');
  });

  it('submits new form with auto-generated slug and navigates to fields builder', async () => {
    mockSaveFormMutateAsync.mockResolvedValue({ id: 'form-123' });
    renderPage();

    const titleInput = screen.getByPlaceholderText('e.g. Area Reservation Form');
    fireEvent.change(titleInput, { target: { value: 'New Form Title' } });

    const submitButton = screen.getByRole('button', { name: 'Next: Manage Fields' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSaveFormMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Form Title',
            slug: 'new-form-title',
          }),
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/admin/forms/form-123/fields');
    });
  });

  it('renders edit mode with existing data and Save Changes button', () => {
    mockUseParams.mockReturnValue({ id: 'form-123' });
    mockUseAdminFormQuery.mockReturnValue({
      data: {
        id: 'form-123',
        title: 'Existing Form',
        slug: 'existing-form',
        description: 'Test description',
        status: 'published',
        duplicate_policy: 'block',
        audience: 'members',
        metadata: {},
      },
      isLoading: false,
    });

    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Edit Form: Existing Form' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('allows moving form to draft, publishing, and archiving', async () => {
    mockUseParams.mockReturnValue({ id: 'form-123' });
    mockUseAdminFormQuery.mockReturnValue({
      data: {
        id: 'form-123',
        title: 'Draft Form',
        slug: 'draft-form',
        description: 'Test description',
        status: 'draft',
        duplicate_policy: 'block',
        audience: 'members',
        metadata: {},
      },
      isLoading: false,
    });
    mockSaveFormMutateAsync.mockResolvedValue({});

    renderPage();

    // 1. Publish the form
    const publishButton = screen.getByRole('button', { name: 'Publish Form' });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(mockSaveFormMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'form-123',
          data: expect.objectContaining({ status: 'published' }),
        }),
      );
    });

    // 2. Archive the form
    const archiveButton = screen.getByRole('button', { name: 'Archive' });
    fireEvent.click(archiveButton);

    const confirmArchiveDialog = await screen.findByRole('heading', {
      level: 2,
      name: 'Archive Form',
    });
    expect(confirmArchiveDialog).toBeInTheDocument();
    const allArchiveButtons = screen.getAllByRole('button', { name: 'Archive' });
    fireEvent.click(allArchiveButtons[allArchiveButtons.length - 1]);

    await waitFor(() => {
      expect(mockSaveFormMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'form-123',
          data: expect.objectContaining({ status: 'archived' }),
        }),
      );
    });
  });

  it('allows restoring an archived form back to draft', async () => {
    mockUseParams.mockReturnValue({ id: 'form-123' });
    mockUseAdminFormQuery.mockReturnValue({
      data: {
        id: 'form-123',
        title: 'Archived Form',
        slug: 'archived-form',
        status: 'archived',
        metadata: {},
      },
      isLoading: false,
    });

    renderPage();

    const moveToDraftButton = screen.getByRole('button', { name: 'Move to Draft' });
    fireEvent.click(moveToDraftButton);

    const confirmDialog = await screen.findByRole('heading', {
      level: 2,
      name: 'Move Form to Draft',
    });
    expect(confirmDialog).toBeInTheDocument();

    const allMoveToDraftButtons = screen.getAllByRole('button', { name: 'Move to Draft' });
    fireEvent.click(allMoveToDraftButtons[allMoveToDraftButtons.length - 1]);

    await waitFor(() => {
      expect(mockSaveFormMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });
  });
});
