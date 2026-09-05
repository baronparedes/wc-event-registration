import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAttendanceDataPage } from '../index';

const {
  mockUseAdminEventQuery,
  mockUseAttendanceSettingsQuery,
  mockUseAttendanceFieldsQuery,
  mockUseAdminEventFieldsQuery,
  mockUseAttendeesLocalCacheQuery,
  mockUseOfflineAttendanceDataSnapshot,
  mockUseAdminAuthQuery,
} = vi.hoisted(() => ({
  mockUseAdminEventQuery: vi.fn(),
  mockUseAttendanceSettingsQuery: vi.fn(),
  mockUseAttendanceFieldsQuery: vi.fn(),
  mockUseAdminEventFieldsQuery: vi.fn(),
  mockUseAttendeesLocalCacheQuery: vi.fn(),
  mockUseOfflineAttendanceDataSnapshot: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/events', () => ({
  useAdminEventQuery: () => mockUseAdminEventQuery(),
}));

vi.mock('@/hooks/domain/attendance', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance')>(
    '@/hooks/domain/attendance',
  );
  return {
    ...actual,
    useAttendanceSettingsQuery: () => mockUseAttendanceSettingsQuery(),
    useAttendeesLocalCacheQuery: () => mockUseAttendeesLocalCacheQuery(),
    useOfflineAttendanceDataSnapshot: () => mockUseOfflineAttendanceDataSnapshot(),
    useAttendanceSavedViewQuery: () => ({ data: null }),
  };
});

vi.mock('@/hooks/domain/attendance-fields', () => ({
  useAttendanceFieldsQuery: () => mockUseAttendanceFieldsQuery(),
}));

vi.mock('@/hooks/domain/event-fields', () => ({
  useAdminEventFieldsQuery: () => mockUseAdminEventFieldsQuery(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => mockUseAdminAuthQuery(),
  canAdminPerform: () => true,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/events/event-1/attendance/data']}>
        <Routes>
          <Route path="/admin/events/:id/attendance/data" element={<AdminAttendanceDataPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminAttendanceDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAdminAuthQuery.mockReturnValue({
      data: { adminRole: 'super_admin' },
    });
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: 'event-1', title: 'Sunday Service' },
      isLoading: false,
    });
    mockUseAttendanceSettingsQuery.mockReturnValue({
      data: { attendance_enabled: true },
      isLoading: false,
    });
    mockUseAttendanceFieldsQuery.mockReturnValue({
      data: [{ id: 'f1', field_key: 'table_no', label: 'Table No', field_type: 'number' }],
      isLoading: false,
    });
    mockUseAdminEventFieldsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseAttendeesLocalCacheQuery.mockReturnValue({
      attendees: [],
      cachedAt: Date.now(),
      isLoading: false,
      isFetching: false,
      refresh: vi.fn(),
      updateAttendanceAnswers: vi.fn(),
    });
    mockUseOfflineAttendanceDataSnapshot.mockReturnValue({
      event: { id: 'event-1', title: 'Sunday Service' },
      settings: { attendance_enabled: true },
      attendanceFields: [{ id: 'f1', field_key: 'table_no', label: 'Table No', field_type: 'number' }],
      registrationFields: [],
      attendees: [],
      isUsingSnapshot: false,
      isOnline: true,
      isLoadingSnapshot: false,
    });
  });

  it('renders page header and attendee details shell', () => {
    renderPage();

    expect(screen.getByText('Manage Attendee Details')).toBeInTheDocument();
    expect(screen.getAllByText(/Sunday Service/)[0]).toBeInTheDocument();
  });

  it('shows warning when attendance tracking is disabled', () => {
    mockUseOfflineAttendanceDataSnapshot.mockReturnValueOnce({
      event: { id: 'event-1', title: 'Sunday Service' },
      settings: { attendance_enabled: false },
      attendanceFields: [],
      registrationFields: [],
      attendees: [],
      isUsingSnapshot: false,
      isOnline: true,
      isLoadingSnapshot: false,
    });

    renderPage();

    expect(screen.getByText('Attendance tracking is disabled')).toBeInTheDocument();
  });

  it('shows info box when no attendance fields are configured', () => {
    mockUseOfflineAttendanceDataSnapshot.mockReturnValueOnce({
      event: { id: 'event-1', title: 'Sunday Service' },
      settings: { attendance_enabled: true },
      attendanceFields: [],
      registrationFields: [],
      attendees: [],
      isUsingSnapshot: false,
      isOnline: true,
      isLoadingSnapshot: false,
    });

    renderPage();

    expect(screen.getByText('No attendance fields configured')).toBeInTheDocument();
  });

  it('shows offline snapshot notice when offline or using snapshot', () => {
    mockUseOfflineAttendanceDataSnapshot.mockReturnValueOnce({
      event: { id: 'event-1', title: 'Sunday Service' },
      settings: { attendance_enabled: true },
      attendanceFields: [{ id: 'f1', field_key: 'table_no', label: 'Table No', field_type: 'number' }],
      registrationFields: [],
      attendees: [],
      isUsingSnapshot: true,
      isOnline: false,
      isLoadingSnapshot: false,
      isSnapshotAvailable: true,
      snapshotCreatedAt: Date.now(),
    });

    renderPage();

    expect(screen.getByText('Offline snapshot view')).toBeInTheDocument();
  });
});
