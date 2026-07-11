import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminEventAttendancePage } from '@/pages/admin/events/[id]/attendance';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

const {
  mockUseParams,
  mockUseAdminEventQuery,
  mockUseAttendanceSettingsQuery,
  mockUpdateMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAttendanceSettingsQuery: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
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
  };
});

vi.mock('@/hooks/domain/attendance', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance')>(
    '@/hooks/domain/attendance',
  );

  return {
    ...actual,
    useAttendanceSettingsQuery: (...args: unknown[]) => mockUseAttendanceSettingsQuery(...args),
    useUpdateAttendanceSettingsMutation: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEventAttendancePage />
    </MemoryRouter>,
  );
}

function getToggleInputByText(labelText: string) {
  const label = screen.getByText(labelText).closest('label');
  expect(label).toBeTruthy();

  const input = label?.querySelector('input[type="checkbox"]');
  expect(input).toBeTruthy();

  return input as HTMLInputElement;
}

function makeDefaultEvent(overrides?: Record<string, unknown>) {
  return {
    id: EVENT_ID,
    title: 'Event Alpha',
    slug: 'event-alpha',
    description: null,
    location: null,
    starts_at: '2026-07-10T08:00:00+08:00',
    ends_at: '2026-07-10T12:00:00+08:00',
    registration_opens_at: '2026-07-01T08:00:00+08:00',
    registration_closes_at: '2026-07-09T20:00:00+08:00',
    status: 'draft',
    duplicate_policy: 'block',
    require_id_lookup: false,
    registration_mode: 'open',
    allow_public_registrations: false,
    metadata: {},
    created_by_admin_id: null,
    created_at: '2026-06-01T00:00:00+08:00',
    updated_at: '2026-06-01T00:00:00+08:00',
    ...overrides,
  };
}

function makeDefaultSettings(overrides?: Record<string, unknown>) {
  return {
    event_id: EVENT_ID,
    attendance_enabled: false,
    timeslot_enabled: false,
    timeslots: [],
    updated_at: '2026-07-01T00:00:00+08:00',
    ...overrides,
  };
}

describe('AdminEventAttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({ id: EVENT_ID });
    mockUseAdminEventQuery.mockReturnValue({
      data: makeDefaultEvent(),
      isLoading: false,
    });

    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: makeDefaultSettings(),
      isLoading: false,
      error: null,
    });

    mockUpdateMutateAsync.mockResolvedValue({
      event_id: EVENT_ID,
    });
  });

  it('renders datetime slot picker constrained to the event window', async () => {
    const { container } = renderPage();

    const attendanceToggle = getToggleInputByText('Enable attendance tracking');
    fireEvent.click(attendanceToggle);

    const timeslotToggle = getToggleInputByText('Enable timeslot attendance');
    await waitFor(() => {
      expect(timeslotToggle).not.toHaveAttribute('disabled');
    });
    fireEvent.click(timeslotToggle);

    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));

    const slotInput = container.querySelector('input[type="datetime-local"]');
    expect(slotInput).toBeTruthy();
    expect((slotInput as HTMLInputElement).getAttribute('min')).toBe('2026-07-10T08:00');
    expect((slotInput as HTMLInputElement).getAttribute('max')).toBe('2026-07-10T12:00');

    fireEvent.change(slotInput as HTMLInputElement, { target: { value: '2026-07-10T13:00' } });
    expect((slotInput as HTMLInputElement).value).toBe('2026-07-10T13:00');

    const saveButton = screen.getByRole('button', { name: 'Save Attendance Settings' });
    const form = saveButton.closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form as HTMLFormElement);

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('accepts in-window datetime slot values', async () => {
    const { container } = renderPage();

    const attendanceToggle = getToggleInputByText('Enable attendance tracking');
    fireEvent.click(attendanceToggle);

    const timeslotToggle = getToggleInputByText('Enable timeslot attendance');
    await waitFor(() => {
      expect(timeslotToggle).not.toHaveAttribute('disabled');
    });
    fireEvent.click(timeslotToggle);

    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));

    const slotInput = container.querySelector('input[type="datetime-local"]');
    expect(slotInput).toBeTruthy();
    fireEvent.change(slotInput as HTMLInputElement, { target: { value: '2026-07-10T10:30' } });
    expect((slotInput as HTMLInputElement).value).toBe('2026-07-10T10:30');
  });

  it('shows loading state while event or settings are loading', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderPage();

    expect(screen.getByText('Loading attendance settings...')).toBeInTheDocument();
  });

  it('shows invalid event ID state when route param is missing', () => {
    mockUseParams.mockReturnValue({ id: undefined });

    renderPage();

    expect(screen.getByText('Invalid event ID.')).toBeInTheDocument();
  });

  it('shows event-not-found state when event query returns null', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Event not found.')).toBeInTheDocument();
  });

  it('shows settings-load error state when settings query fails', () => {
    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('load failed'),
    });

    renderPage();

    expect(screen.getByText('Failed to load attendance settings.')).toBeInTheDocument();
  });

  it('enables timeslot toggle only after attendance tracking is enabled', async () => {
    renderPage();

    const timeslotToggle = getToggleInputByText('Enable timeslot attendance');
    expect(timeslotToggle).toBeDisabled();

    fireEvent.click(getToggleInputByText('Enable attendance tracking'));

    await waitFor(() => {
      expect(timeslotToggle).not.toBeDisabled();
    });
  });

  it('renders breadcrumb link to event detail', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Event Alpha' })).toHaveAttribute(
      'href',
      `/admin/events/${EVENT_ID}`,
    );
  });

  it('submits attendance settings and shows success toast', async () => {
    renderPage();

    fireEvent.click(getToggleInputByText('Enable attendance tracking'));

    const saveButton = screen.getByRole('button', { name: 'Save Attendance Settings' });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        event_id: EVENT_ID,
        attendance_enabled: true,
        timeslot_enabled: false,
        timeslots: [],
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Attendance settings updated successfully.');
  });

  it('shows mutation error toast when save fails', async () => {
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error('Save failed'));

    renderPage();

    fireEvent.click(getToggleInputByText('Enable attendance tracking'));

    const saveButton = screen.getByRole('button', { name: 'Save Attendance Settings' });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Save failed');
    });
  });

  it('requires event date-time range when timeslot mode is enabled', async () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: makeDefaultEvent({ starts_at: null, ends_at: null }),
      isLoading: false,
    });

    const { container } = renderPage();

    fireEvent.click(getToggleInputByText('Enable attendance tracking'));
    fireEvent.click(getToggleInputByText('Enable timeslot attendance'));
    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));

    const slotInput = container.querySelector('input[type="datetime-local"]');
    expect(slotInput).toBeTruthy();
    fireEvent.change(slotInput as HTMLInputElement, { target: { value: '2026-07-10T10:30' } });

    const saveButton = screen.getByRole('button', { name: 'Save Attendance Settings' });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Event start and end date-time are required for timeslot attendance.',
      );
    });
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('omits min and max constraints when event date-times are invalid', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: makeDefaultEvent({ starts_at: 'not-a-date', ends_at: undefined }),
      isLoading: false,
    });

    const { container } = renderPage();

    fireEvent.click(getToggleInputByText('Enable attendance tracking'));
    fireEvent.click(getToggleInputByText('Enable timeslot attendance'));
    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));

    const slotInput = container.querySelector('input[type="datetime-local"]');
    expect(slotInput).toBeTruthy();
    expect((slotInput as HTMLInputElement).getAttribute('min')).toBeNull();
    expect((slotInput as HTMLInputElement).getAttribute('max')).toBeNull();
  });

  it('allows removing configured timeslots', async () => {
    const { container } = renderPage();

    fireEvent.click(getToggleInputByText('Enable attendance tracking'));
    fireEvent.click(getToggleInputByText('Enable timeslot attendance'));

    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Timeslot' }));

    expect(container.querySelectorAll('input[type="datetime-local"]').length).toBe(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(container.querySelectorAll('input[type="datetime-local"]').length).toBe(1);
  });

  it('renders read-only state for archived events', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: makeDefaultEvent({ status: 'archived' }),
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Archived event')).toBeInTheDocument();
    expect(getToggleInputByText('Enable attendance tracking')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Attendance Settings' })).toBeDisabled();
  });
});
