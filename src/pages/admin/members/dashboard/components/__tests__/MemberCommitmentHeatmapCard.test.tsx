import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { MemberSundayCommitmentHeatmap } from '@/lib/domain/members';

import { MemberCommitmentHeatmapCard } from '../MemberCommitmentHeatmapCard';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

describe('MemberCommitmentHeatmapCard', () => {
  const sampleHeatmap: MemberSundayCommitmentHeatmap = {
    maxCount: 10,
    totalCommittedMembers: 20,
    sundays: [
      { key: 'first_sunday', label: '1st Sunday', shortLabel: '1st Sun' },
      { key: 'second_sunday', label: '2nd Sunday', shortLabel: '2nd Sun' },
    ],
    timeSlots: [
      { key: '9AM', label: '9:00 AM' },
      { key: '12NN', label: '12:00 NN' },
      { key: '3PM', label: '3:00 PM' },
    ],
    slots: [
      // 0 count -> unstaffed (danger)
      {
        sundayKey: 'first_sunday',
        sundayLabel: '1st Sunday',
        timeSlot: '9AM',
        timeSlotLabel: '9:00 AM',
        count: 0,
        percentage: 0,
        members: [],
      },
      // Low count -> ratio 3/10 = 0.3 (< 0.55) -> accent
      {
        sundayKey: 'first_sunday',
        sundayLabel: '1st Sunday',
        timeSlot: '12NN',
        timeSlotLabel: '12:00 NN',
        count: 3,
        percentage: 15,
        members: [{ id: 'm-1', fullName: 'Test Member 1', role: 'Usher', avatarObjectKey: null }],
      },
      // Med count -> ratio 6/10 = 0.6 (>= 0.55 && < 0.8) -> secondary
      {
        sundayKey: 'first_sunday',
        sundayLabel: '1st Sunday',
        timeSlot: '3PM',
        timeSlotLabel: '3:00 PM',
        count: 6,
        percentage: 30,
        members: [{ id: 'm-2', fullName: 'Test Member 2', role: 'Coach', avatarObjectKey: null }],
      },
      // High count -> ratio 9/10 = 0.9 (>= 0.8) -> primary
      {
        sundayKey: 'second_sunday',
        sundayLabel: '2nd Sunday',
        timeSlot: '9AM',
        timeSlotLabel: '9:00 AM',
        count: 9,
        percentage: 45,
        members: [{ id: 'm-3', fullName: 'Test Member 3', role: 'Leader', avatarObjectKey: null }],
      },
      {
        sundayKey: 'second_sunday',
        sundayLabel: '2nd Sunday',
        timeSlot: '12NN',
        timeSlotLabel: '12:00 NN',
        count: 0,
        percentage: 0,
        members: [],
      },
      {
        sundayKey: 'second_sunday',
        sundayLabel: '2nd Sunday',
        timeSlot: '3PM',
        timeSlotLabel: '3:00 PM',
        count: 0,
        percentage: 0,
        members: [],
      },
    ],
  };

  it('renders heatmap title, subtitle, and legend tiers', () => {
    render(
      <MemoryRouter>
        <MemberCommitmentHeatmapCard heatmap={sampleHeatmap} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sunday Commitment Heatmap')).toBeInTheDocument();
    expect(screen.getByText(/20 total/i)).toBeInTheDocument();
    expect(screen.getByText(/Intensity Tiers/i)).toBeInTheDocument();
    expect(screen.getByText('1st Sunday')).toBeInTheDocument();
    expect(screen.getByText('2nd Sunday')).toBeInTheDocument();
  });

  it('opens SlotAttendeesModal when clicking a slot cell and closes on dialog dismiss', () => {
    render(
      <MemoryRouter>
        <MemberCommitmentHeatmapCard heatmap={sampleHeatmap} />
      </MemoryRouter>,
    );

    // Click the 9-volunteer slot on 2nd Sunday
    const cellButtons = screen.getAllByRole('button');
    const highCellButton = cellButtons.find(
      (btn) => btn.textContent?.includes('9') && btn.textContent?.includes('45%'),
    );
    expect(highCellButton).toBeDefined();

    fireEvent.click(highCellButton!);

    // Modal should now be visible
    expect(screen.getByText('2nd Sunday — 9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Test Member 3')).toBeInTheDocument();

    // Close the modal
    fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByText('2nd Sunday — 9:00 AM')).not.toBeInTheDocument();
  });
});
