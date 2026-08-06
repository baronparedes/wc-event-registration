import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExportMonthBirthdaysButton } from '@/pages/admin/members/milestones/components/ExportMonthBirthdaysButton';

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

describe('ExportMonthBirthdaysButton', () => {
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
    render(<ExportMonthBirthdaysButton members={[]} year={2026} monthIndex={5} />);

    const button = screen.getByRole('button', { name: 'Export Month Birthdays CSV' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('escapes CSV values that contain commas, quotes, and newlines', async () => {
    const members = [
      makeMember({
        full_name: 'Jane, "JJ" Doe',
        nickname: 'Line\nBreak',
        email: 'jane@example.com',
        phone: '123',
      }),
    ];

    render(<ExportMonthBirthdaysButton members={members} year={2026} monthIndex={5} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Birthdays CSV' }));

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

    render(<ExportMonthBirthdaysButton members={[makeMember()]} year={2026} monthIndex={5} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Birthdays CSV' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('CSV failed');
    });

    expect(screen.getByRole('button', { name: 'Export Month Birthdays CSV' })).toBeEnabled();
  });
});
