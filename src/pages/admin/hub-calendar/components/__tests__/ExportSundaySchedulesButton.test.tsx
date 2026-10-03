import { faker } from '@faker-js/faker';
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
    full_name: 'Test Member',
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    nickname: 'Test Nick',
    email: 'test.member@example.com',
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
          full_name: 'Test Zulu',
          role: 'Greeter',
        }),
        sundayKey: 'first_sunday',
        timeSlots: ['12NN', '9AM'],
      },
      {
        member: makeMember({
          id: 'm2',
          member_id: 'MEM-002',
          full_name: 'Test Alpha',
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
      'Time Slot,Member ID,Full Name,Nickname,Role,Category,Confidence Level,Turnup Rate,Email,Phone,Excused,Excused Reason',
    );
    // 9AM slot: Test Alpha first, then Test Zulu
    expect(lines[1]).toContain('9:00 AM,MEM-002,Test Alpha,Test Nick,Usher,adult');
    expect(lines[2]).toContain('9:00 AM,MEM-001,Test Zulu,Test Nick,Greeter,adult');
    // 12NN slot: Test Zulu
    expect(lines[3]).toContain('12:00 NN,MEM-001,Test Zulu,Test Nick,Greeter,adult');
    // 3PM slot: Test Alpha
    expect(lines[4]).toContain('3:00 PM,MEM-002,Test Alpha,Test Nick,Usher,adult');
  });

  it('escapes CSV cells with quotes, commas, and newlines', async () => {
    const entries: MemberScheduleEntry[] = [
      {
        member: makeMember({
          full_name: 'Test, "JJ" Member',
          nickname: 'Test Line\nBreak',
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

    expect(csvText).toContain('"Test, ""JJ"" Member"');
    expect(csvText).toContain('"Test Line\nBreak"');
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
      full_name: 'Test Excused Volunteer',
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
      'Time Slot,Member ID,Full Name,Nickname,Role,Category,Confidence Level,Turnup Rate,Email,Phone,Excused,Excused Reason',
    );
    expect(lines[1]).toContain('9:00 AM,MEM-001,Test Excused Volunteer');
    expect(lines[1]).toContain(',Yes,Vacation leave');
  });
});
