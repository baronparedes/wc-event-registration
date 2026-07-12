import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAttendanceDataPage } from '@/pages/admin/events/[id]/attendance/data';

const EVENT_ID = 'ed27d3ac-ddb7-4cb4-9f44-2194c864e410';

const {
  mockUseParams,
  mockUseAdminEventQuery,
  mockUseAttendanceSettingsQuery,
  mockUseAttendanceFieldsQuery,
  mockUseAttendanceAnswersQuery,
  mockUseDownloadAttendanceCSVMutation,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAttendanceSettingsQuery: vi.fn(),
  mockUseAttendanceFieldsQuery: vi.fn(),
  mockUseAttendanceAnswersQuery: vi.fn(),
  mockUseDownloadAttendanceCSVMutation: vi.fn(),
}));

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
    useAttendanceAnswersQuery: (...args: unknown[]) => mockUseAttendanceAnswersQuery(...args),
    useDownloadAttendanceCSVMutation: (...args: unknown[]) =>
      mockUseDownloadAttendanceCSVMutation(...args),
  };
});

vi.mock('@/hooks/domain/attendance-fields', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance-fields')>(
    '@/hooks/domain/attendance-fields',
  );

  return {
    ...actual,
    useAttendanceFieldsQuery: (...args: unknown[]) => mockUseAttendanceFieldsQuery(...args),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAttendanceDataPage />
    </MemoryRouter>,
  );
}

describe('AdminAttendanceDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({ id: EVENT_ID });

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
        offline_check_in_queue_enabled: false,
        timeslot_enabled: false,
        timeslots: [],
        updated_at: '2026-07-04T00:00:00Z',
      },
      isLoading: false,
    });

    mockUseAttendanceAnswersQuery.mockReturnValue({
      data: [
        {
          registration_id: 'reg-1',
          member_id: 'MID-001',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          answers: [],
        },
      ],
      isLoading: false,
    });

    mockUseDownloadAttendanceCSVMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it('shows only active attendance fields in the attendee details table', () => {
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
    expect(screen.getByRole('columnheader', { name: 'Shirt Size' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Legacy Note' })).not.toBeInTheDocument();
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
        offline_check_in_queue_enabled: false,
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
        offline_check_in_queue_enabled: false,
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

  it('shows loading state while attendance answers query is loading', () => {
    mockUseAttendanceAnswersQuery.mockReturnValue({
      data: [],
      isLoading: true,
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
});
