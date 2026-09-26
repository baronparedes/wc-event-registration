import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

import { MobileVolunteerCard } from '../MobileVolunteerCard';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name, avatarObjectKey }: { name: string; avatarObjectKey?: string | null }) => (
    <div data-testid="avatar" data-avatar-key={avatarObjectKey ?? ''}>
      {name}
    </div>
  ),
}));

describe('MobileVolunteerCard', () => {
  const mockStat: CommitmentDashboardStat = {
    user_id: 'user-1',
    member_id: 'MEM-001',
    avatar_object_key: 'avatars/alice.jpg',
    full_name: 'Alice Smith',
    nickname: 'Ali',
    email: 'alice@example.com',
    role: 'Usher',
    category: 'Women',
    start_date: '2024-01-01',
    committed: 10,
    attended: 8,
    absences: 2,
    excused: 1,
    wi_9am_3pm: 2,
    wi_12nn: 3,
    wi_5th_sunday: 3,
    attendance_score: 8.5,
  };

  it('renders all volunteer details and formatted values matching the table view', () => {
    render(<MobileVolunteerCard stat={mockStat} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('(Ali)')).toBeInTheDocument();
    expect(screen.getByText('Usher • Women')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('+8')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByText('-0.5')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument(); // wi_9am_3pm: 2 * 0.5 = 1
    expect(screen.getByText('3')).toBeInTheDocument(); // wi_12nn
    expect(screen.getByText('+3')).toBeInTheDocument(); // wi_5th_sunday: +3
  });

  it('renders 0 values when counts are zero and negative score styling', () => {
    const zeroStat: CommitmentDashboardStat = {
      ...mockStat,
      start_date: '',
      role: '',
      category: '',
      committed: 0,
      attended: 0,
      absences: 0,
      excused: 0,
      wi_9am_3pm: 0,
      wi_12nn: 0,
      wi_5th_sunday: 0,
      attendance_score: -2,
    };

    render(<MobileVolunteerCard stat={zeroStat} />);

    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(5);
  });

  it('triggers onClick handler on click and keyboard interaction', () => {
    const handleClick = vi.fn();
    render(<MobileVolunteerCard stat={mockStat} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockStat);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
