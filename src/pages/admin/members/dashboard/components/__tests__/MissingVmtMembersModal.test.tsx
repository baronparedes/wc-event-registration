import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import type { MemberVmtMigrationAnalytics } from '@/lib/domain/members';

import { MissingVmtMembersModal } from '../MissingVmtMembersModal';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name?: string }) => <div data-testid="avatar">{name}</div>,
}));

const sampleAnalytics: MemberVmtMigrationAnalytics = {
  totalMembers: 5,
  migratedCount: 2,
  missingCount: 3,
  missingBothCount: 1,
  missingIdOnlyCount: 1,
  missingDateOnlyCount: 1,
  migratedPercentage: 40,
  missingPercentage: 60,
  missingMembers: [
    {
      id: 'm-1',
      memberId: 'RFID-1',
      fullName: 'Test Alice Santos',
      role: 'Prayer Coach',
      email: 'alice@example.com',
      phone: '09171234567',
      avatarObjectKey: null,
      hasCcfVmtId: false,
      hasCcfVmtDate: false,
      ccfVmtId: null,
      ccfVmtDate: null,
    },
    {
      id: 'm-2',
      memberId: 'RFID-2',
      fullName: 'Test Bob Cruz',
      role: 'Usher',
      email: 'bob@example.com',
      phone: null,
      avatarObjectKey: 'avatars/bob.jpg',
      hasCcfVmtId: false,
      hasCcfVmtDate: true,
      ccfVmtId: null,
      ccfVmtDate: '2026-10-10',
    },
    {
      id: 'm-3',
      memberId: 'RFID-3',
      fullName: 'Test Cara Reyes',
      role: 'IMT Support',
      email: null,
      phone: null,
      avatarObjectKey: null,
      hasCcfVmtId: true,
      hasCcfVmtDate: false,
      ccfVmtId: 'VMT-300',
      ccfVmtDate: null,
    },
  ],
};

describe('MissingVmtMembersModal', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <MissingVmtMembersModal isOpen={false} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Missing CCF VMT Data')).not.toBeInTheDocument();
  });

  it('renders missing members with status badges, roles, and profile links', () => {
    render(
      <MemoryRouter>
        <MissingVmtMembersModal isOpen={true} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Missing CCF VMT Data')).toBeInTheDocument();
    expect(
      screen.getByText(
        /3 of 5 active members missing ccf_vmt_id or ccf_vmt_date \(40% migrated\)/i,
      ),
    ).toBeInTheDocument();

    expect(screen.getAllByText('Test Alice Santos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Missing ID & Date')).toBeInTheDocument();

    expect(screen.getAllByText('Test Bob Cruz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Missing VMT ID')).toBeInTheDocument();

    expect(screen.getAllByText('Test Cara Reyes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Missing VMT Date')).toBeInTheDocument();

    const profileLinks = screen.getAllByRole('link', { name: /Profile/i });
    expect(profileLinks).toHaveLength(3);
    expect(profileLinks[0]).toHaveAttribute('href', '/admin/members/m-1');
    expect(profileLinks[1]).toHaveAttribute('href', '/admin/members/m-2');
    expect(profileLinks[2]).toHaveAttribute('href', '/admin/members/m-3');
    expect(screen.getByText('Total: 3')).toBeInTheDocument();
  });

  it('filters members by name, member ID, or role and clears search', () => {
    render(
      <MemoryRouter>
        <MissingVmtMembersModal isOpen={true} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search members by name, ID, or role...');
    fireEvent.change(searchInput, { target: { value: 'RFID-2' } });

    expect(screen.queryByText('Prayer Coach')).not.toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Total: 1')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No members found matching your search.')).toBeInTheDocument();
    expect(screen.getByText('Total: 0')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);
    expect(screen.getByText('Total: 3')).toBeInTheDocument();
  });

  it('renders empty state when all active members are migrated', () => {
    render(
      <MemoryRouter>
        <MissingVmtMembersModal
          isOpen={true}
          onClose={vi.fn()}
          analytics={{
            totalMembers: 5,
            migratedCount: 5,
            missingCount: 0,
            missingBothCount: 0,
            missingIdOnlyCount: 0,
            missingDateOnlyCount: 0,
            migratedPercentage: 100,
            missingPercentage: 0,
            missingMembers: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('All active members have both ccf_vmt_id and ccf_vmt_date recorded.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search members by name, ID, or role...'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Total: 0')).toBeInTheDocument();
  });

  it('calls onClose and resets search when Close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <MissingVmtMembersModal isOpen={true} onClose={onClose} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Export CSV button when list is empty and exports filtered CSV when clicked', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { rerender } = render(
      <MemoryRouter>
        <MissingVmtMembersModal
          isOpen={true}
          onClose={vi.fn()}
          analytics={{
            totalMembers: 5,
            migratedCount: 5,
            missingCount: 0,
            missingBothCount: 0,
            missingIdOnlyCount: 0,
            missingDateOnlyCount: 0,
            migratedPercentage: 100,
            missingPercentage: 0,
            missingMembers: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();

    rerender(
      <MemoryRouter>
        <MissingVmtMembersModal isOpen={true} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    expect(exportBtn).toBeEnabled();
    fireEvent.click(exportBtn);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    expect(toast.success).toHaveBeenCalledWith('Exported 3 members missing CCF VMT data to CSV');

    // Filter to a single matching member and export only filtered results
    vi.mocked(toast.success).mockClear();
    createObjectURLSpy.mockClear();

    const searchInput = screen.getByPlaceholderText('Search members by name, ID, or role...');
    fireEvent.change(searchInput, { target: { value: 'usher' } });
    fireEvent.click(exportBtn);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const exportedBlob = createObjectURLSpy.mock.calls[0]?.[0] as Blob;
    expect(exportedBlob).toBeInstanceOf(Blob);
    expect(toast.success).toHaveBeenCalledWith('Exported 1 member missing CCF VMT data to CSV');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
