import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminForm, FormSubmission } from '@/lib/domain/forms';
import { AdminFormSubmissionsPage } from '@/pages/admin/forms/[id]/submissions';

const { mockUseParams, mockUseAdminFormQuery, mockUseFormSubmissionsQuery } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseAdminFormQuery: vi.fn(),
  mockUseFormSubmissionsQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock('@/hooks/domain/forms', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/forms')>('@/hooks/domain/forms');
  return {
    ...actual,
    useAdminFormQuery: (...args: unknown[]) => mockUseAdminFormQuery(...args),
    useFormSubmissionsQuery: (...args: unknown[]) => mockUseFormSubmissionsQuery(...args),
  };
});

vi.mock('@/pages/admin/forms/components', () => ({
  FormNavigationLinks: () => <nav data-testid="form-nav-links">Form Nav</nav>,
}));

const mockForm: AdminForm = {
  id: 'form-123',
  slug: 'volunteer-signup',
  title: 'Volunteer Signup',
  description: 'Sign up to volunteer',
  status: 'published',
  duplicate_policy: 'allow_multiple',
  audience: 'members_and_public',
  metadata: {},
  created_by_admin_id: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockSubmissions: FormSubmission[] = [
  {
    id: 'sub-1',
    form_id: 'form-123',
    source: 'member',
    status: 'submitted',
    idempotency_key: null,
    user_id: 'user-1',
    public_registrant_info: null,
    submitted_at: '2026-01-15T10:30:00Z',
    created_at: '2026-01-15T10:30:00Z',
    updated_at: '2026-01-15T10:30:00Z',
    users: {
      member_id: 'WC-001',
      full_name: 'Jane Doe',
      email: 'jane@example.com',
    },
    form_submission_answers: [
      {
        id: 'ans-1',
        submission_id: 'sub-1',
        form_field_id: 'field-1',
        answer_text: 'Morning Shift',
        answer_number: null,
        answer_boolean: null,
        answer_date: null,
        answer_json: null,
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
        form_fields: {
          field_key: 'preferred_shift',
          label: 'Preferred Shift',
          field_type: 'text',
        },
      },
    ],
  },
  {
    id: 'sub-2',
    form_id: 'form-123',
    source: 'guest',
    status: 'submitted',
    idempotency_key: null,
    user_id: null,
    submitted_at: '2026-01-16T14:00:00Z',
    created_at: '2026-01-16T14:00:00Z',
    updated_at: '2026-01-16T14:00:00Z',
    public_registrant_info: {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '09123456789',
    },
    form_submission_answers: [],
  },
];

describe('AdminFormSubmissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'volunteer-signup' });
    mockUseAdminFormQuery.mockReturnValue({
      data: mockForm,
      isLoading: false,
      error: null,
    });
    mockUseFormSubmissionsQuery.mockReturnValue({
      data: mockSubmissions,
      isLoading: false,
      error: null,
    });
  });

  it('renders page header, breadcrumbs, navLinks, and count description', () => {
    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Manage Submissions' })).toBeInTheDocument();
    expect(screen.getByText('2 form submissions')).toBeInTheDocument();
    expect(screen.getByTestId('form-nav-links')).toBeInTheDocument();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
  });

  it('displays published status banner when form is published', () => {
    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('This form is published. All submissions are visible.'),
    ).toBeInTheDocument();
  });

  it('displays draft banner when form is in draft mode', () => {
    mockUseAdminFormQuery.mockReturnValue({
      data: { ...mockForm, status: 'draft' },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('This form is in draft mode. Submissions are not yet open to the public.'),
    ).toBeInTheDocument();
  });

  it('displays closed banner when form is archived', () => {
    mockUseAdminFormQuery.mockReturnValue({
      data: { ...mockForm, status: 'archived' },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('This form is closed. Submissions are read-only.')).toBeInTheDocument();
  });

  it('filters submissions by search input for memberId, email, and phone', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by respondent, member ID, or email');

    // Search by memberId
    fireEvent.change(searchInput, { target: { value: 'WC-001' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();

    // Search by guest phone
    fireEvent.change(searchInput, { target: { value: '09123456789' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getAllByText('John Smith')[0]).toBeInTheDocument();

    // Search by email
    fireEvent.change(searchInput, { target: { value: 'john.smith@example.com' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getAllByText('John Smith')[0]).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders singular count when there is only 1 submission', () => {
    mockUseFormSubmissionsQuery.mockReturnValue({
      data: [mockSubmissions[0]],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('1 form submission')).toBeInTheDocument();
    expect(screen.getByText('Showing all 1 submission')).toBeInTheDocument();
  });

  it('filters submissions by source tabs', () => {
    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    const guestTab = screen.getByRole('button', { name: 'Guests' });
    fireEvent.click(guestTab);

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getAllByText('John Smith')[0]).toBeInTheDocument();

    const membersTab = screen.getByRole('button', { name: 'Members' });
    fireEvent.click(membersTab);

    expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
    expect(screen.getAllByText('John Smith')[0]).toBeInTheDocument();

    // Click All tab explicitly
    const allTab = screen.getByRole('button', { name: /All/i });
    fireEvent.click(guestTab);
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    fireEvent.click(allTab);
    expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
  });

  it('opens submission detail dialog when view answers button is clicked', () => {
    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    const viewButtons = screen.getAllByRole('button', { name: /View Answers/i });
    fireEvent.click(viewButtons[0]);

    expect(screen.getByRole('heading', { name: 'Submission Details' })).toBeInTheDocument();
    expect(screen.getByText('Preferred Shift')).toBeInTheDocument();
    expect(screen.getByText('Morning Shift')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons[0]);

    expect(screen.queryByRole('heading', { name: 'Submission Details' })).not.toBeInTheDocument();
  });

  it('renders empty state when there are no submissions', () => {
    mockUseFormSubmissionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });

  it('renders error state when query fails', () => {
    mockUseAdminFormQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load form'),
    });

    render(
      <MemoryRouter>
        <AdminFormSubmissionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Error loading submissions: Failed to load form/i)).toBeInTheDocument();
  });
});
