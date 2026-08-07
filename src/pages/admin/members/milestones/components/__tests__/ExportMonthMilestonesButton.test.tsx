import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MilestoneEntry } from '@/pages/admin/members/milestones';
import { ExportMonthMilestonesButton } from '@/pages/admin/members/milestones/components/ExportMonthMilestonesButton';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

function makeMember(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'member-1',
    member_id: 'WC-001',
    avatar_object_key: null,
    is_active: true,
    full_name: 'Jane Doe',
    first_name: 'Jane',
    last_name: 'Doe',
    nickname: 'J',
    email: null,
    phone: null,
    date_of_birth: '1990-06-15',
    role: 'member',
    category: 'adult',
    extra_metadata: {},
    created_at: '2026-06-15T00:00:00.000Z',
    updated_at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeMilestoneEntry(overrides?: Partial<MilestoneEntry>): MilestoneEntry {
  return {
    id: 'member-1-birthday',
    type: 'birthday',
    member: makeMember(),
    ...overrides,
  };
}

describe('ExportMonthMilestonesButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });
  });

  it('disables export when there are no members', () => {
    render(<ExportMonthMilestonesButton milestoneEntries={[]} year={2026} monthIndex={5} />);

    const button = screen.getByRole('button', { name: 'Export Month Milestones CSV' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('escapes CSV values that contain commas, quotes, and newlines', async () => {
    const milestoneEntries = [
      makeMilestoneEntry({
        id: 'member-1-birthday',
        type: 'birthday',
        member: makeMember({
          full_name: 'Jane, "JJ" Doe',
          nickname: 'Line\nBreak',
          email: 'jane@example.com',
          phone: '123',
        }),
      }),
    ];

    render(
      <ExportMonthMilestonesButton
        milestoneEntries={milestoneEntries}
        year={2026}
        monthIndex={5}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Milestones CSV' }));

    const createObjectURLMock = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const exportedBlob = createObjectURLMock.mock.calls[0]?.[0];
    const csvText = await exportedBlob.text();

    expect(csvText).toContain('"Jane, ""JJ"" Doe"');
    expect(csvText).toContain('"Line\nBreak"');
  });

  it('shows a toast error message when export fails and re-enables the button', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => {
        throw new Error('CSV failed');
      }),
    });

    render(
      <ExportMonthMilestonesButton
        milestoneEntries={[makeMilestoneEntry()]}
        year={2026}
        monthIndex={5}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Milestones CSV' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('CSV failed');
    });

    expect(screen.getByRole('button', { name: 'Export Month Milestones CSV' })).toBeEnabled();
  });

  it('includes milestone type and date columns, sorted by date then type then name', async () => {
    const milestoneEntries: MilestoneEntry[] = [
      makeMilestoneEntry({
        id: 'member-2-wedding',
        type: 'wedding_anniversary',
        member: makeMember({
          id: 'member-2',
          member_id: 'WC-002',
          full_name: 'John Roe',
          date_of_birth: '1990-06-15',
          extra_metadata: { wedanniv_date: '2001-06-10' },
        }),
      }),
      makeMilestoneEntry({
        id: 'member-1-birthday',
        type: 'birthday',
        member: makeMember({
          id: 'member-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          date_of_birth: '1990-06-10',
        }),
      }),
      makeMilestoneEntry({
        id: 'member-3-wedding',
        type: 'wedding_anniversary',
        member: makeMember({
          id: 'member-3',
          member_id: 'WC-003',
          full_name: 'Alice Able',
          extra_metadata: { wedanniv_date: '2001-06-10' },
        }),
      }),
    ];

    render(
      <ExportMonthMilestonesButton
        milestoneEntries={milestoneEntries}
        year={2026}
        monthIndex={5}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Milestones CSV' }));

    const createObjectURLMock = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const exportedBlob = createObjectURLMock.mock.calls[0]?.[0];
    const csvText = await exportedBlob.text();
    const lines = csvText.split('\n');

    expect(lines[0]).toBe(
      'Member ID,Full Name,Nickname,Milestone Type,Milestone Date,Email,Phone,Role,Category',
    );
    expect(lines[1]).toContain('WC-001,Jane Doe,J,Birthday,1990-06-10');
    expect(lines[2]).toContain('WC-003,Alice Able,J,Wedding Anniversary,2001-06-10');
    expect(lines[3]).toContain('WC-002,John Roe,J,Wedding Anniversary,2001-06-10');
  });
});
