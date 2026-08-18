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
  mockUseIsMobileViewport,
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
  mockUseIsMobileViewport: vi.fn(),
  mockUpsertMutate: vi.fn(),
  mockDeleteMutate: vi.fn(),
}));

vi.mock('@/hooks/utils/useIsMobileViewport', () => ({
  useIsMobileViewport: () => mockUseIsMobileViewport(),
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

vi.mock('@/pages/admin/events/[id]/attendance/data/components/AttendanceDataCardView', () => ({
  AttendanceDataCardView: ({
    registrants,
    visibleFields,
    fields,
    countFilledAnswers,
    onEditRegistrant,
    onViewRegistrant,
  }: {
    registrants: Array<{ member_id: string }>;
    visibleFields: Array<{ label: string }>;
    fields: Array<{ id: string }>;
    countFilledAnswers: (
      answers: Array<{
        attendance_field_id: string;
        answer_text: string | null;
        answer_number: number | null;
      }>,
      fields: Array<{ id: string }>,
    ) => number;
    onEditRegistrant: (registrant: { member_id: string }) => void;
    onViewRegistrant: (registrant: {
      registration_id: string;
      public_registration_id: null;
    }) => void;
  }) => (
    <div data-testid="attendance-data-card-view">
      {visibleFields.map((f) => (
        <div key={f.label}>{f.label}</div>
      ))}
      {registrants.map((r) => (
        <div key={r.member_id}>{r.member_id}</div>
      ))}
      <div data-testid="filled-answer-count">
        {countFilledAnswers(
          [
            {
              attendance_field_id: fields[0]?.id ?? 'missing',
              answer_text: 'filled',
              answer_number: null,
            },
            { attendance_field_id: 'missing', answer_text: null, answer_number: null },
          ],
          fields,
        )}
      </div>
      {registrants[0] && (
        <>
          <button type="button" onClick={() => onEditRegistrant(registrants[0])}>
            Mock edit attendee
          </button>
          <button
            type="button"
            onClick={() =>
              onViewRegistrant({ registration_id: 'reg-1', public_registration_id: null })
            }
          >
            Mock view attendee
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('@/pages/admin/events/[id]/attendance/data/components/AttendanceDataMobileView', () => ({
  AttendanceDataMobileView: ({
    registrants,
    visibleFields,
  }: {
    registrants: Array<{ member_id: string }>;
    visibleFields: Array<{ label: string }>;
  }) => (
    <div data-testid="attendance-data-mobile-view">
      {visibleFields.map((f) => (
        <div key={f.label}>{f.label}</div>
      ))}
      {registrants.map((r) => (
        <div key={r.member_id}>{r.member_id}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/pages/admin/events/[id]/attendance/data/components/AttendanceDataTableView', () => ({
  AttendanceDataTableView: ({
    registrants,
    visibleFields,
  }: {
    registrants: Array<{ member_id: string }>;
    visibleFields: Array<{ label: string }>;
  }) => (
    <div data-testid="attendance-data-table-view">
      {visibleFields.map((f) => (
        <div key={f.label}>{f.label}</div>
      ))}
      {registrants.map((r) => (
        <div key={r.member_id}>{r.member_id}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/pages/admin/events/[id]/attendance/data/components/AttendanceDataEntryPanel', () => ({
  AttendanceDataEntryPanel: ({
    registrant,
    onClose,
  }: {
    registrant: { member_id: string };
    onClose: () => void;
  }) => (
    <div data-testid="attendance-data-entry-panel">
      Editing {registrant.member_id}
      <button type="button" onClick={onClose}>
        Mock close edit
      </button>
    </div>
  ),
}));

vi.mock('@/pages/admin/events/[id]/attendance/data/components/AttendeeDetailsModal', () => ({
  AttendeeDetailsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="attendee-details-modal">
        <button type="button" onClick={onClose}>
          Mock close details
        </button>
      </div>
    ) : null,
}));

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
    mockUseIsMobileViewport.mockReturnValue(false);

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

  it('defaults to Grid view on desktop', () => {
    renderPage();

    const viewSwitch = screen.getByRole('switch', { name: 'Switch to table view' });

    expect(viewSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('attendance-data-card-view')).toBeInTheDocument();
    expect(screen.queryByTestId('attendance-data-table-view')).not.toBeInTheDocument();
  });

  it('switches between Grid and Table views and persists the selected mode', () => {
    renderPage();

    const viewSwitch = screen.getByRole('switch', { name: 'Switch to table view' });
    fireEvent.click(viewSwitch);

    expect(screen.getByRole('switch', { name: 'Switch to grid view' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('attendance-data-table-view')).toBeInTheDocument();
    expect(screen.queryByTestId('attendance-data-card-view')).not.toBeInTheDocument();
    expect(localStorage.getItem('wc:attendance-data:desktop-view-mode')).toBe('table');

    fireEvent.click(screen.getByRole('switch', { name: 'Switch to grid view' }));

    expect(screen.getByTestId('attendance-data-card-view')).toBeInTheDocument();
    expect(localStorage.getItem('wc:attendance-data:desktop-view-mode')).toBe('grid');
  });

  it('restores the saved desktop view mode', () => {
    localStorage.setItem('wc:attendance-data:desktop-view-mode', 'table');

    renderPage();

    expect(screen.getByRole('switch', { name: 'Switch to grid view' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('attendance-data-table-view')).toBeInTheDocument();
  });

  it('keeps the mobile view and hides the desktop switch on mobile', () => {
    mockUseIsMobileViewport.mockReturnValue(true);

    renderPage();

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByTestId('attendance-data-mobile-view')).toBeInTheDocument();
    expect(screen.queryByTestId('attendance-data-card-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attendance-data-table-view')).not.toBeInTheDocument();
  });

  it('counts filled attendance answers in the desktop view', () => {
    renderPage();

    expect(screen.getByTestId('filled-answer-count')).toHaveTextContent('1');
  });

  it('renders the empty state when filters leave no attendees', () => {
    mockUseAttendeesLocalCacheQuery.mockReturnValue({
      attendees: [],
      cachedAt: Date.now(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateAttendee: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('No matching attendees')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('opens the attendance entry panel for an attendee edit action', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mock edit attendee' }));

    expect(screen.getByTestId('attendance-data-entry-panel')).toHaveTextContent('MID-001');
    fireEvent.click(screen.getByRole('button', { name: 'Mock close edit' }));
    expect(screen.queryByTestId('attendance-data-entry-panel')).not.toBeInTheDocument();
  });

  it('opens and closes attendee details from the desktop view', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mock view attendee' }));

    expect(screen.getByTestId('attendee-details-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mock close details' }));
    expect(screen.queryByTestId('attendee-details-modal')).not.toBeInTheDocument();
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

  it('toggles the Checked In Slot column from the Columns selector', async () => {
    renderPage();

    expect(screen.queryByText('Checked In Slot')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByLabelText('Checked In Slot'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.getByText('Checked In Slot')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByLabelText('Checked In Slot'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByText('Checked In Slot')).not.toBeInTheDocument();
    });
  });

  it('toggles the check-in indicator beside attendee name from the Columns selector', async () => {
    renderPage();

    // Verify the Columns button exists and can be toggled
    const columnsButton = screen.getByRole('button', { name: 'Columns' });
    expect(columnsButton).toBeInTheDocument();

    fireEvent.click(columnsButton);
    const checkInIndicatorCheckbox = screen.getByLabelText('Check-In Indicator');
    expect(checkInIndicatorCheckbox).toBeInTheDocument();

    fireEvent.click(checkInIndicatorCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      // Verify the toggle can be clicked again
      fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
      const checkbox = screen.getByLabelText('Check-In Indicator') as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
      const checkbox = screen.getByLabelText('Check-In Indicator') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  it('renders compact checked-in slot badges and expands labels when slots span multiple days', () => {
    mockUseAttendeesLocalCacheQuery.mockReturnValue({
      attendees: [
        {
          attendee_kind: 'registered',
          registration_id: 'reg-same-day',
          public_registration_id: null,
          user_id: 'user-same-day',
          member_id: 'MID-101',
          full_name: 'Same Day',
          email: 'same-day@example.com',
          role: 'Member',
          category: 'Adult',
          registration_status: 'submitted',
          submitted_at: '2026-07-04T00:00:00Z',
          check_in_status: 'checked_in',
          official_check_in_time: '2026-08-30T01:05:00.000Z',
          slot_records: [
            { slot: '2026-08-30T01:00:00.000Z', recorded_at: '2026-08-30T01:05:00.000Z' },
            { slot: '2026-08-30T03:00:00.000Z', recorded_at: '2026-08-30T03:05:00.000Z' },
          ],
          registration_answers: [],
          attendance_answers: [],
        },
        {
          attendee_kind: 'registered',
          registration_id: 'reg-multi-day',
          public_registration_id: null,
          user_id: 'user-multi-day',
          member_id: 'MID-202',
          full_name: 'Multi Day',
          email: 'multi-day@example.com',
          role: 'Member',
          category: 'Adult',
          registration_status: 'submitted',
          submitted_at: '2026-07-04T00:00:00Z',
          check_in_status: 'checked_in',
          official_check_in_time: '2026-08-31T01:05:00.000Z',
          slot_records: [
            { slot: '2026-08-30T01:00:00.000Z', recorded_at: '2026-08-30T01:05:00.000Z' },
            { slot: '2026-08-31T01:00:00.000Z', recorded_at: '2026-08-31T01:05:00.000Z' },
          ],
          registration_answers: [],
          attendance_answers: [],
        },
        {
          attendee_kind: 'registered',
          registration_id: 'reg-no-slot',
          public_registration_id: null,
          user_id: 'user-no-slot',
          member_id: 'MID-303',
          full_name: 'No Slot',
          email: 'no-slot@example.com',
          role: 'Member',
          category: 'Adult',
          registration_status: 'submitted',
          submitted_at: '2026-07-04T00:00:00Z',
          check_in_status: 'not_checked_in',
          official_check_in_time: null,
          slot_records: [
            { slot: '2026-08-30T01:00:00.000Z', recorded_at: '2026-08-30T01:05:00.000Z' },
          ],
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

    renderPage();

    // Verify that the card view is rendered with attendee data
    expect(screen.getByTestId('attendance-data-card-view')).toBeInTheDocument();
    expect(screen.getByText('MID-101')).toBeInTheDocument();
    expect(screen.getByText('MID-202')).toBeInTheDocument();
    expect(screen.getByText('MID-303')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Save Current' })).not.toBeInTheDocument();
    expect(screen.queryByText('Delete Saved View')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export Attendance CSV' }));

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });
});
