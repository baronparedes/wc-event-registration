import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/unit-test-utils';
import { AdminAttendanceDataPage } from '@/pages/admin/events/[id]/attendance/data';

const EVENT_ID = 'ed27d3ac-ddb7-4cb4-9f44-2194c864e410';

const {
  mockUseParams,
  mockUseAdminAuthQuery,
  mockUseAdminEventQuery,
  mockUseAttendanceSettingsQuery,
  mockUseAttendanceFieldsQuery,
  mockUseAdminEventFieldsQuery,
  mockUseAttendeesLocalCacheQuery,
  mockUseAttendanceSavedViewQuery,
  mockUseAttendanceSavedViewsQuery,
  mockUpsertMutate,
  mockDeleteMutate,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAttendanceSettingsQuery: vi.fn(),
  mockUseAttendanceFieldsQuery: vi.fn(),
  mockUseAdminEventFieldsQuery: vi.fn(),
  mockUseAttendeesLocalCacheQuery: vi.fn(),
  mockUseAttendanceSavedViewQuery: vi.fn(),
  mockUseAttendanceSavedViewsQuery: vi.fn(),
  mockUpsertMutate: vi.fn(),
  mockDeleteMutate: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');

  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events');

  return {
    ...actual,
    useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
  };
});

vi.mock('@/hooks/domain/attendance', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance')>(
    '@/hooks/domain/attendance',
  );

  return {
    ...actual,
    useAttendanceSettingsQuery: (...args: unknown[]) => mockUseAttendanceSettingsQuery(...args),
    useAttendanceSavedViewQuery: (...args: unknown[]) => mockUseAttendanceSavedViewQuery(...args),
    useAttendanceSavedViewsQuery: (...args: unknown[]) => mockUseAttendanceSavedViewsQuery(...args),
    useAttendeesLocalCacheQuery: (...args: unknown[]) => mockUseAttendeesLocalCacheQuery(...args),
    useUpsertAttendanceSavedViewMutation: () => ({ mutate: mockUpsertMutate, isPending: false }),
    useDeleteAttendanceSavedViewMutation: () => ({ mutate: mockDeleteMutate, isPending: false }),
  };
});

const selectedViewStorageKey = `wc:attendance-data:selected-view:${EVENT_ID}`;

const savedView = {
  id: 'view-1',
  event_id: EVENT_ID,
  name: 'Saved Attendance View',
  view_config: {
    nameOrMemberQuery: 'Jane',
    role: ['Member'],
    category: 'Adult',
    checkInStatus: 'checked_in',
    dynamicFilters: [],
    groupBy: [],
    visibleFields: [],
  },
  created_at: '2026-07-04T00:00:00Z',
  updated_at: '2026-07-04T00:00:00Z',
};

vi.mock('@/hooks/domain/attendance-fields', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance-fields')>(
    '@/hooks/domain/attendance-fields',
  );

  return {
    ...actual,
    useAttendanceFieldsQuery: (...args: unknown[]) => mockUseAttendanceFieldsQuery(...args),
  };
});

vi.mock('@/hooks/domain/event-fields', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/event-fields')>(
    '@/hooks/domain/event-fields',
  );

  return {
    ...actual,
    useAdminEventFieldsQuery: (...args: unknown[]) => mockUseAdminEventFieldsQuery(...args),
  };
});

function renderPage(initialEntries?: string[]) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AdminAttendanceDataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminAttendanceDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    mockUseParams.mockReturnValue({ id: EVENT_ID });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'admin' },
      isLoading: false,
    });

    mockUseAdminEventQuery.mockReturnValue({
      data: {
        id: EVENT_ID,
        title: 'Event Alpha',
      },
      isLoading: false,
    });

    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: {
        event_id: EVENT_ID,
        attendance_enabled: true,
        timeslot_enabled: false,
        timeslots: [],
        updated_at: '2026-07-04T00:00:00Z',
      },
      isLoading: false,
    });

    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseAttendeesLocalCacheQuery.mockReturnValue({
      attendees: [
        {
          attendee_kind: 'registered',
          registration_id: 'reg-1',
          public_registration_id: null,
          user_id: 'user-1',
          member_id: 'MID-001',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'Member',
          category: 'Adult',
          registration_status: 'submitted',
          submitted_at: '2026-07-04T00:00:00Z',
          check_in_status: 'not_checked_in',
          official_check_in_time: null,
          registration_answers: [],
          attendance_answers: [],
        },
      ],
      cachedAt: Date.now(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateAttendee: vi.fn(),
    });

    mockUseAttendanceSavedViewQuery.mockImplementation((viewId: string | undefined) => ({
      data: viewId === savedView.id ? savedView : undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));

    mockUseAttendanceSavedViewsQuery.mockReturnValue({
      data: [savedView],
    });

    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [
        {
          id: 'attendance-field-1',
          event_id: EVENT_ID,
          field_key: 'area',
          label: 'Area',
          field_type: 'select',
          is_required: false,
          is_active: true,
          display_order: 0,
          options: [],
          validation_rules: {},
          created_at: '2026-07-04T00:00:00Z',
          updated_at: '2026-07-04T00:00:00Z',
        },
      ],
      isLoading: false,
    });

    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: [
        {
          id: 'registration-field-1',
          event_id: EVENT_ID,
          field_key: 'service',
          label: 'Service',
          field_type: 'select',
          is_required: false,
          is_active: true,
          placeholder: null,
          help_text: null,
          options: [],
          validation_rules: {},
          display_order: 0,
          created_at: '2026-07-04T00:00:00Z',
          updated_at: '2026-07-04T00:00:00Z',
        },
      ],
      isLoading: false,
    });
  });

  it('renders the simplified attendee details table with fixed columns', () => {
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [
        {
          id: 'field-active',
          event_id: EVENT_ID,
          field_key: 'shirt_size',
          label: 'Shirt Size',
          field_type: 'select',
          is_required: false,
          is_active: true,
          display_order: 0,
          options: [],
          validation_rules: {},
          created_at: '2026-07-04T00:00:00Z',
          updated_at: '2026-07-04T00:00:00Z',
        },
      ],
      isLoading: false,
    });

    renderPage();

    expect(mockUseAttendanceFieldsQuery).toHaveBeenCalledWith(EVENT_ID, { activeOnly: true });
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.queryByText('Shirt Size')).not.toBeInTheDocument();
  });

  it('shows no-fields warning when all attendance fields are inactive', () => {
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(mockUseAttendanceFieldsQuery).toHaveBeenCalledWith(EVENT_ID, { activeOnly: true });
    expect(screen.getByText('No attendance fields configured')).toBeInTheDocument();
  });

  it('shows disabled warning when attendance tracking is off', () => {
    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: {
        event_id: EVENT_ID,
        attendance_enabled: false,
        timeslot_enabled: false,
        timeslots: [],
        updated_at: '2026-07-04T00:00:00Z',
      },
      isLoading: false,
    });

    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Attendance tracking is disabled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Attendance Settings' })).toHaveAttribute(
      'href',
      `/admin/events/${EVENT_ID}/attendance`,
    );
  });

  it('shows generic attendance settings copy when event id is missing', () => {
    mockUseParams.mockReturnValue({ id: undefined });
    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: {
        event_id: EVENT_ID,
        attendance_enabled: false,
        timeslot_enabled: false,
        timeslots: [],
        updated_at: '2026-07-04T00:00:00Z',
      },
      isLoading: false,
    });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText(/Enable attendance tracking in/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to Attendance' })).not.toBeInTheDocument();
    expect(mockUseAttendanceFieldsQuery).toHaveBeenCalledWith(undefined, { activeOnly: true });
  });

  it('renders event-not-found state when event query returns null', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Event not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to events' })).toHaveAttribute(
      'href',
      '/admin/events',
    );
  });

  it('shows loading state while attendance data dependencies are loading', () => {
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: true,
    });

    renderPage();

    expect(screen.getByText('Loading attendance data...')).toBeInTheDocument();
  });

  it('shows loading state while event query is loading', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Loading attendance data...')).toBeInTheDocument();
  });

  it('shows loading state while settings query is loading', () => {
    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Loading attendance data...')).toBeInTheDocument();
  });

  it('shows loading state while attendee cache query is loading', () => {
    mockUseAttendeesLocalCacheQuery.mockReturnValue({
      attendees: [],
      cachedAt: null,
      isLoading: true,
      isFetching: true,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateAttendee: vi.fn(),
    });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Loading attendance data...')).toBeInTheDocument();
  });

  it('shows generic no-fields copy when event id is missing', () => {
    mockUseParams.mockReturnValue({ id: undefined });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderPage();

    expect(
      screen.getByText('Configure attendance fields first to start collecting data.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Configure attendance fields' }),
    ).not.toBeInTheDocument();
  });

  it('renders filter field selector with registration and attendance sub-groups', async () => {
    renderPage();

    // Expand filters to access hidden controls
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    const filterFieldButton = screen.getByRole('button', { name: 'Filter field' });
    expect(filterFieldButton).toBeInTheDocument();

    fireEvent.click(filterFieldButton);

    // Wait for and verify group headers and options appear in the dropdown
    await waitFor(() => {
      expect(screen.getByText('Registration Fields')).toBeInTheDocument();
      expect(screen.getByText('Attendance Fields')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Service' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Area' })).toBeInTheDocument();
    });
  });

  it('restores a saved view from localStorage when the URL has no viewId', async () => {
    localStorage.setItem(selectedViewStorageKey, savedView.id);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Viewing saved filter:')).toBeInTheDocument();
      expect(screen.getByText(savedView.name)).toBeInTheDocument();
    });
  });

  it('persists the selected saved view when a view is applied', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Views' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(localStorage.getItem(selectedViewStorageKey)).toBe(savedView.id);
      expect(screen.getByText('Viewing saved filter:')).toBeInTheDocument();
      expect(screen.getByText(savedView.name)).toBeInTheDocument();
    });
  });

  it('clears the persisted saved view when Clear is clicked', async () => {
    localStorage.setItem(selectedViewStorageKey, savedView.id);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(savedView.name)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(localStorage.getItem(selectedViewStorageKey)).toBeNull();
      expect(screen.queryByText('Viewing saved filter:')).not.toBeInTheDocument();
    });
  });

  it('restores the active saved view when Clear filters is clicked', async () => {
    renderPage([`/?viewId=${savedView.id}`]);

    const input = (await screen.findByLabelText('Name or Member ID')) as HTMLInputElement;
    const clearFiltersButton = screen.getByRole('button', { name: 'Clear filters' });

    await waitFor(() => {
      expect(input.value).toBe('Jane');
      expect(screen.getByText(savedView.name)).toBeInTheDocument();
      expect(clearFiltersButton).toBeDisabled();
    });

    fireEvent.change(input, { target: { value: 'MID-001' } });
    expect(input.value).toBe('MID-001');
    expect(clearFiltersButton).toBeEnabled();

    fireEvent.click(clearFiltersButton);

    await waitFor(() => {
      expect((screen.getByLabelText('Name or Member ID') as HTMLInputElement).value).toBe('Jane');
      expect(screen.getByText('Viewing saved filter:')).toBeInTheDocument();
      expect(clearFiltersButton).toBeDisabled();
    });
  });

  it('adds a group level and shows subgrouped dynamic field options', async () => {
    renderPage();

    // Expand filters to access the Add group level button
    fireEvent.click(screen.getByRole('button', { name: 'Expand filters' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add group level' }));

    expect(screen.getByText('Level 1')).toBeInTheDocument();

    // Click on the grouping field dropdown to open it
    const groupingButton = screen.getByRole('button', { name: 'Level 1 field' });
    expect(groupingButton).toBeInTheDocument();
    fireEvent.click(groupingButton);

    // Wait for and verify the Registration Fields and Attendance Fields groups are present
    await waitFor(() => {
      expect(screen.getByText('Registration Fields')).toBeInTheDocument();
      expect(screen.getByText('Attendance Fields')).toBeInTheDocument();
    });
  });

  it('renders and updates the name or member ID filter input', () => {
    renderPage();

    const input = screen.getByLabelText('Name or Member ID') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'MID-001' } });
    expect(input.value).toBe('MID-001');
  });

  it('exports attendance csv from the active view when attendance is enabled', async () => {
    renderPage();

    const exportButton = screen.getByRole('button', { name: 'Export Attendance CSV' });
    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  it('lets slod open views and export csv while keeping write controls hidden', async () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'slod' },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByRole('button', { name: 'Views' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Attendance CSV' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Upload CSV' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fill In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Views' }));
    expect(screen.getByRole('button', { name: 'Save Current' })).toBeInTheDocument();
    expect(screen.queryByText('Delete Saved View')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export Attendance CSV' }));

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });
});
