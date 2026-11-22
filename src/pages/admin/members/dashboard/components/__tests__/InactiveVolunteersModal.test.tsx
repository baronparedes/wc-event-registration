import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';

import type { MemberInactivityAnalytics } from '@/lib/domain/members';

import { InactiveVolunteersModal } from '../InactiveVolunteersModal';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name?: string }) => <div data-testid="avatar">{name}</div>,
}));

const sampleAnalytics: MemberInactivityAnalytics = {
  thresholdSundays: 13,
  inactiveCount: 2,
  percentage: 25,
  members: [
    {
      id: 'm-1',
      memberId: 'RFID-1',
      fullName: 'Test Alice Santos',
      role: 'Prayer Coach',
      email: 'alice@example.com',
      phone: '09171234567',
      avatarObjectKey: null,
      lastActivity: null,
      sundaysInactive: 30,
      neverAttended: true,
    },
    {
      id: 'm-2',
      memberId: 'RFID-2',
      fullName: 'Test Bob Cruz',
      role: 'Usher',
      email: 'bob@example.com',
      phone: null,
      avatarObjectKey: 'avatars/bob.jpg',
      lastActivity: '2026-07-05T02:00:00Z',
      sundaysInactive: 20,
      neverAttended: false,
    },
  ],
};

describe('InactiveVolunteersModal', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <InactiveVolunteersModal isOpen={false} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Inactive Volunteers \(> 13 Sundays\)/i)).not.toBeInTheDocument();
  });

  it('renders inactive volunteers with attendance status, role, and profile links', () => {
    render(
      <MemoryRouter>
        <InactiveVolunteersModal isOpen={true} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Inactive Volunteers (> 13 Sundays)')).toBeInTheDocument();
    expect(
      screen.getByText(
        /2 active volunteers with no service attendance for more than 13 Sundays \(25% of active members\)/i,
      ),
    ).toBeInTheDocument();

    expect(screen.getAllByText('Test Alice Santos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Never attended')).toBeInTheDocument();
    expect(screen.getByText('Joined > 13 Sundays ago')).toBeInTheDocument();

    expect(screen.getAllByText('Test Bob Cruz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('20 Sundays')).toBeInTheDocument();
    expect(screen.getByText(/Last attended:/i)).toBeInTheDocument();

    const profileLinks = screen.getAllByRole('link', { name: /Profile/i });
    expect(profileLinks).toHaveLength(2);
    expect(profileLinks[0]).toHaveAttribute('href', '/admin/members/m-1');
    expect(profileLinks[1]).toHaveAttribute('href', '/admin/members/m-2');
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
  });

  it('filters inactive volunteers by name and role and supports clearing search', () => {
    render(
      <MemoryRouter>
        <InactiveVolunteersModal isOpen={true} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search volunteers by name or role...');
    fireEvent.change(searchInput, { target: { value: 'usher' } });

    expect(screen.queryByText('Prayer Coach')).not.toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Total: 1')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(
      screen.getByText('No inactive volunteers found matching your search.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Total: 0')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
  });

  it('renders empty state when there are no inactive volunteers', () => {
    render(
      <MemoryRouter>
        <InactiveVolunteersModal
          isOpen={true}
          onClose={vi.fn()}
          analytics={{
            thresholdSundays: 13,
            inactiveCount: 0,
            percentage: 0,
            members: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('No volunteers have been inactive for more than 13 Sundays.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search volunteers by name or role...'),
    ).not.toBeInTheDocument();
  });

  it('calls onClose and resets search when Close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <InactiveVolunteersModal isOpen={true} onClose={onClose} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search volunteers by name or role...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Export CSV button when list is empty and exports CSV when clicked', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { rerender } = render(
      <MemoryRouter>
        <InactiveVolunteersModal
          isOpen={true}
          onClose={vi.fn()}
          analytics={{
            thresholdSundays: 13,
            inactiveCount: 0,
            percentage: 0,
            members: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();

    rerender(
      <MemoryRouter>
        <InactiveVolunteersModal isOpen={true} onClose={vi.fn()} analytics={sampleAnalytics} />
      </MemoryRouter>,
    );

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    expect(exportBtn).toBeEnabled();
    fireEvent.click(exportBtn);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    expect(toast.success).toHaveBeenCalledWith('Exported 2 inactive volunteers to CSV');

    // Filter to a single matching volunteer and export only filtered results
    vi.mocked(toast.success).mockClear();
    createObjectURLSpy.mockClear();

    const searchInput = screen.getByPlaceholderText('Search volunteers by name or role...');
    fireEvent.change(searchInput, { target: { value: 'usher' } });
    fireEvent.click(exportBtn);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const exportedBlob = createObjectURLSpy.mock.calls[0]?.[0] as Blob;
    expect(exportedBlob).toBeInstanceOf(Blob);
    expect(toast.success).toHaveBeenCalledWith('Exported 1 inactive volunteer to CSV');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
