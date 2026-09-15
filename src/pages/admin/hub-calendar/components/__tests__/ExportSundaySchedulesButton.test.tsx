import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import { ExportSundaySchedulesButton } from '../ExportSundaySchedulesButton';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

function makeMember(overrides?: Partial<AdminMember>): AdminMember {
  return {
    id: 'member-1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    full_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    nickname: 'Johnny',
    email: 'john@example.com',
    phone: '123-456-7890',
    date_of_birth: '1990-01-01',
    role: 'Usher',
    category: 'adult',
    extra_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ExportSundaySchedulesButton', () => {
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

  it('disables export when there are no scheduled entries', () => {
    render(
      <ExportSundaySchedulesButton selectedEntries={[]} year={2026} monthIndex={8} dayNumber={6} />,
    );

    const button = screen.getByRole('button', { name: 'Export Schedules CSV' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('generates CSV sorted by time slot then member name', async () => {
    const entries: MemberScheduleEntry[] = [
      {
        member: makeMember({
          id: 'm1',
          member_id: 'MEM-001',
          full_name: 'Zack Morris',
          role: 'Greeter',
        }),
        sundayKey: 'first_sunday',
        timeSlots: ['12NN', '9AM'],
      },
      {
        member: makeMember({
          id: 'm2',
          member_id: 'MEM-002',
          full_name: 'Alice Wonder',
          role: 'Usher',
        }),
        sundayKey: 'first_sunday',
        timeSlots: ['9AM', '3PM'],
      },
    ];

    render(
      <ExportSundaySchedulesButton
        selectedEntries={entries}
        year={2026}
        monthIndex={8}
        dayNumber={6}
      />,
    );

    const button = screen.getByRole('button', { name: 'Export Schedules CSV' });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    const createObjectURLMock = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const exportedBlob = createObjectURLMock.mock.calls[0]?.[0];
    const csvText = await exportedBlob.text();
    const lines = csvText.split('\n');

    expect(lines[0]).toBe(
      'Time Slot,Member ID,Full Name,Nickname,Role,Category,Email,Phone,Excused,Excused Reason',
    );
    // 9AM slot: Alice Wonder first, then Zack Morris
    expect(lines[1]).toContain('9:00 AM,MEM-002,Alice Wonder,Johnny,Usher,adult');
    expect(lines[2]).toContain('9:00 AM,MEM-001,Zack Morris,Johnny,Greeter,adult');
    // 12NN slot: Zack Morris
    expect(lines[3]).toContain('12:00 NN,MEM-001,Zack Morris,Johnny,Greeter,adult');
    // 3PM slot: Alice Wonder
    expect(lines[4]).toContain('3:00 PM,MEM-002,Alice Wonder,Johnny,Usher,adult');
  });

  it('escapes CSV cells with quotes, commas, and newlines', async () => {
    const entries: MemberScheduleEntry[] = [
      {
        member: makeMember({
          full_name: 'Jane, "JJ" Doe',
          nickname: 'Line\nBreak',
        }),
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
    ];

    render(
      <ExportSundaySchedulesButton
        selectedEntries={entries}
        year={2026}
        monthIndex={8}
        dayNumber={6}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Schedules CSV' }));

    const createObjectURLMock = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const exportedBlob = createObjectURLMock.mock.calls[0]?.[0];
    const csvText = await exportedBlob.text();

    expect(csvText).toContain('"Jane, ""JJ"" Doe"');
    expect(csvText).toContain('"Line\nBreak"');
  });

  it('shows error toast when export throws', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => {
        throw new Error('Export failure');
      }),
    });

    const entries: MemberScheduleEntry[] = [
      {
        member: makeMember(),
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
    ];

    render(
      <ExportSundaySchedulesButton
        selectedEntries={entries}
        year={2026}
        monthIndex={8}
        dayNumber={6}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Schedules CSV' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Export failure');
    });

    expect(screen.getByRole('button', { name: 'Export Schedules CSV' })).toBeEnabled();
  });

  it('passes excusedMap to CSV generator and includes excused fields', async () => {
    const member = makeMember({
      id: 'member-excused-1',
      member_id: 'MEM-001',
      full_name: 'Excused Volunteer',
    });

    const entries: MemberScheduleEntry[] = [
      {
        member,
        sundayKey: 'first_sunday',
        timeSlots: ['9AM'],
      },
    ];

    const excusedMap = new Map([
      [
        '2026-09-06',
        new Map([
          [
            'member-excused-1',
            {
              slots: new Set(['9AM' as const]),
              reasons: new Map([['9AM' as const, 'Vacation leave']]),
            },
          ],
        ]),
      ],
    ]);

    render(
      <ExportSundaySchedulesButton
        selectedEntries={entries}
        year={2026}
        monthIndex={8}
        dayNumber={6}
        excusedMap={excusedMap}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Schedules CSV' }));

    const createObjectURLMock = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const exportedBlob = createObjectURLMock.mock.calls[0]?.[0];
    const csvText = await exportedBlob.text();
    const lines = csvText.split('\n');

    expect(lines[0]).toBe(
      'Time Slot,Member ID,Full Name,Nickname,Role,Category,Email,Phone,Excused,Excused Reason',
    );
    expect(lines[1]).toContain('9:00 AM,MEM-001,Excused Volunteer');
    expect(lines[1]).toContain(',Yes,Vacation leave');
  });
});
