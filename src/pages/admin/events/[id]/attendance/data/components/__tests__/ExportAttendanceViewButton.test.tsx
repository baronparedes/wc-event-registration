import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as attendanceViews from '@/lib/domain/attendance-views';

import { ExportAttendanceViewButton } from '../ExportAttendanceViewButton';

vi.mock('@/lib/domain/attendance-views', () => ({
  buildAttendanceViewCsvExport: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('ExportAttendanceViewButton', () => {
  const defaultProps = {
    eventId: 'test-event-1',
    attendanceEnabled: true,
    filteredAttendees: [],
    groups: [],
    visibleFields: [],
    disabled: false,
  };

  let createObjectURLMock: Mock;
  let revokeObjectURLMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    revokeObjectURLMock = vi.fn();

    globalThis.URL.createObjectURL = createObjectURLMock as unknown as (
      obj: Blob | MediaSource,
    ) => string;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock as unknown as (url: string) => void;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders correctly', () => {
    render(<ExportAttendanceViewButton {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<ExportAttendanceViewButton {...defaultProps} disabled={true} />);
    expect(screen.getByRole('button', { name: /Export/i })).toBeDisabled();
  });

  it('is disabled and does not export if attendance is disabled', () => {
    render(<ExportAttendanceViewButton {...defaultProps} attendanceEnabled={false} />);
    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);
    expect(attendanceViews.buildAttendanceViewCsvExport).not.toHaveBeenCalled();
  });

  it('downloads CSV when clicked', async () => {
    vi.mocked(attendanceViews.buildAttendanceViewCsvExport).mockReturnValue({
      csvText: 'Name,Email\nTest,test@example.com',
      filename: 'attendance.csv',
    });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const el = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === 'a') {
          el.click = clickSpy;
        }
        return el;
      },
    );

    render(<ExportAttendanceViewButton {...defaultProps} />);

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(attendanceViews.buildAttendanceViewCsvExport).toHaveBeenCalledWith({
        eventId: defaultProps.eventId,
        filteredAttendees: defaultProps.filteredAttendees,
        groups: defaultProps.groups,
        visibleFields: defaultProps.visibleFields,
      });

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();
    });
  });

  it('shows error toast when export fails', async () => {
    vi.mocked(attendanceViews.buildAttendanceViewCsvExport).mockImplementation(() => {
      throw new Error('Test error');
    });

    render(<ExportAttendanceViewButton {...defaultProps} />);

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Test error');
    });
  });
});
