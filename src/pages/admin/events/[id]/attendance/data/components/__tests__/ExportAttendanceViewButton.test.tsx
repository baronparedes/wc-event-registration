import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportAttendanceViewButton } from '../ExportAttendanceViewButton';

describe('ExportAttendanceViewButton', () => {
  it('triggers CSV download when enabled and clicked', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    render(
      <ExportAttendanceViewButton
        eventId="e1"
        attendanceEnabled={true}
        filteredAttendees={[]}
        groups={[]}
        visibleFields={[]}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Export Attendance CSV' });
    fireEvent.click(btn);

    expect(createObjectURL).toHaveBeenCalled();
  });

  it('does nothing when disabled or attendance is not enabled', () => {
    const createObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;

    render(
      <ExportAttendanceViewButton
        eventId="e1"
        attendanceEnabled={false}
        filteredAttendees={[]}
        groups={[]}
        visibleFields={[]}
        disabled={true}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Export Attendance CSV' });
    fireEvent.click(btn);

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
