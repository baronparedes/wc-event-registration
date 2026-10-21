import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { MemberSundayCommitmentSlot } from '@/lib/domain/members';

import { SlotAttendeesModal } from '../SlotAttendeesModal';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

describe('SlotAttendeesModal', () => {
  const sampleSlot: MemberSundayCommitmentSlot = {
    sundayKey: 'first_sunday',
    sundayLabel: '1st Sunday',
    timeSlot: '9AM',
    timeSlotLabel: '9:00 AM',
    count: 2,
    percentage: 50,
    members: [
      {
        id: 'user-1',
        fullName: 'Test Alice Usher',
        role: 'Usher',
        avatarObjectKey: null,
      },
      {
        id: 'user-2',
        fullName: 'Test Bob Coach',
        role: 'Prayer Coach',
        avatarObjectKey: 'avatar-bob.png',
      },
    ],
  };

  it('renders nothing when slot is null', () => {
    const { container } = render(
      <MemoryRouter>
        <SlotAttendeesModal isOpen={true} onClose={vi.fn()} slot={null} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders slot title, plural description, and attendee list', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <SlotAttendeesModal isOpen={true} onClose={handleClose} slot={sampleSlot} />
      </MemoryRouter>,
    );

    expect(screen.getByText('1st Sunday — 9:00 AM')).toBeInTheDocument();
    expect(screen.getByText(/2 volunteers scheduled for this service time/i)).toBeInTheDocument();
    expect(screen.getByText('Test Alice Usher')).toBeInTheDocument();
    expect(screen.getByText('Test Bob Coach')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders singular description when count is 1', () => {
    const singleMemberSlot: MemberSundayCommitmentSlot = {
      ...sampleSlot,
      count: 1,
      percentage: 100,
      members: [sampleSlot.members[0]],
    };

    render(
      <MemoryRouter>
        <SlotAttendeesModal isOpen={true} onClose={vi.fn()} slot={singleMemberSlot} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/1 volunteer scheduled for this service time/i)).toBeInTheDocument();
  });

  it('renders empty slot state when members array is empty', () => {
    const emptySlot: MemberSundayCommitmentSlot = {
      ...sampleSlot,
      count: 0,
      percentage: 0,
      members: [],
    };

    render(
      <MemoryRouter>
        <SlotAttendeesModal isOpen={true} onClose={vi.fn()} slot={emptySlot} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No volunteers committed to this slot.')).toBeInTheDocument();
  });

  it('displays search input when slot has more than 5 members and filters results', () => {
    const manyMembersSlot: MemberSundayCommitmentSlot = {
      ...sampleSlot,
      count: 6,
      members: [
        { id: 'u-1', fullName: 'Test Member 1', role: 'Usher', avatarObjectKey: null },
        { id: 'u-2', fullName: 'Test Member 2', role: 'Usher', avatarObjectKey: null },
        { id: 'u-3', fullName: 'Test Member 3', role: 'Prayer Coach', avatarObjectKey: null },
        { id: 'u-4', fullName: 'Test Member 4', role: 'Usher', avatarObjectKey: null },
        { id: 'u-5', fullName: 'Test Member 5', role: 'Usher', avatarObjectKey: null },
        { id: 'u-6', fullName: 'Test Special Person', role: 'Leader', avatarObjectKey: null },
      ],
    };

    render(
      <MemoryRouter>
        <SlotAttendeesModal isOpen={true} onClose={vi.fn()} slot={manyMembersSlot} />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search volunteers by name or role...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'special' } });
    expect(screen.getByText('Test Special Person')).toBeInTheDocument();
    expect(screen.queryByText('Test Member 1')).not.toBeInTheDocument();

    // Search query with no match
    fireEvent.change(searchInput, { target: { value: 'unknown-query' } });
    expect(screen.getByText('No volunteers found matching your search.')).toBeInTheDocument();
  });
});
